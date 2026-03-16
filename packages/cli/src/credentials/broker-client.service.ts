import crypto from 'crypto';

import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class BrokerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BrokerError';
	}
}

/** Broker returned 404 – tokens not yet available, retry later. */
export class BrokerTokenNotReadyError extends BrokerError {
	constructor(message: string) {
		super(message);
		this.name = 'BrokerTokenNotReadyError';
	}
}

/** Broker returned 410 – pickup window has closed, user must reconnect. */
export class BrokerTokenExpiredError extends BrokerError {
	constructor(message: string) {
		super(message);
		this.name = 'BrokerTokenExpiredError';
	}
}

/** Broker returned 401 on token refresh – refresh token is invalid, user must reconnect. */
export class BrokerRefreshRejectedError extends BrokerError {
	constructor(message: string) {
		super(message);
		this.name = 'BrokerRefreshRejectedError';
	}
}

/** Broker returned 502 – temporarily unreachable, retry later. */
export class BrokerUnavailableError extends BrokerError {
	constructor(message: string) {
		super(message);
		this.name = 'BrokerUnavailableError';
	}
}

/** Broker returned 409 – this instance is already registered. */
export class BrokerAlreadyRegisteredError extends BrokerError {
	constructor(message: string) {
		super(message);
		this.name = 'BrokerAlreadyRegisteredError';
	}
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenSet extends IDataObject {
	access_token: string;
	refresh_token?: string;
}

// ---------------------------------------------------------------------------

const BROKER_API_KEY_SETTING = 'brokerApiKey';

@Service()
export class BrokerClientService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly settingsRepository: SettingsRepository,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = logger.scoped('broker-auth');
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	private getBrokerUrl(): string {
		const url = this.globalConfig.brokerAuth.url;
		if (!url) {
			throw new BrokerError('N8N_OAUTH_BROKER_URL is not configured');
		}
		return url;
	}

	private isBrokerEnabled(): boolean {
		return !!this.globalConfig.brokerAuth.url && this.globalConfig.brokerAuth.enabled;
	}

	private async getBrokerApiKey(): Promise<string> {
		const row = await this.settingsRepository.findByKey(BROKER_API_KEY_SETTING);
		if (!row?.value) {
			throw new BrokerError('Broker API key not found – run broker registration first');
		}
		return row.value;
	}

	private deriveRegistrationHash(instanceId: string, consumerId: string): string {
		return crypto.createHash('sha256').update(`${instanceId}${consumerId}`).digest('hex');
	}

	// ---------------------------------------------------------------------------
	// Public API
	// ---------------------------------------------------------------------------

	/**
	 * Ensures this instance is registered with the broker.
	 * If an API key is already stored in the database, returns immediately.
	 * Otherwise calls `registerInstance` to obtain and persist the key.
	 * Should be called once at startup when `N8N_OAUTH_BROKER_URL` is set and
	 * `N8N_BROKER_AUTH_ENABLED` is not `false`.
	 * No-ops silently if broker auth is not enabled.
	 */
	async ensureRegistered(
		instanceId: string,
		instanceBaseUrl: string,
		consumerId: string,
	): Promise<void> {
		if (!this.isBrokerEnabled()) {
			return;
		}
		const existing = await this.settingsRepository.findByKey(BROKER_API_KEY_SETTING);
		if (existing?.value) {
			this.logger.debug('Already registered, skipping');
			return;
		}
		try {
			await this.registerInstance(instanceId, instanceBaseUrl, consumerId);
		} catch (error) {
			if (error instanceof BrokerAlreadyRegisteredError) {
				// Broker has a record for this instance but we lost the key.
				// The operator must rotate the key via POST /keys/rotate on the broker.
				this.logger.warn(
					'Instance is already registered with the broker but no API key is stored locally. ' +
						'Use POST /keys/rotate on the broker to issue a new key, then store it via registerInstance.',
				);
				return;
			}
			throw error;
		}
	}

	/**
	 * Registers this n8n instance with the broker and returns the issued API key.
	 * Uses `X-Instance-Hash` (SHA-256 of `instanceId + consumerId`) as the registration credential.
	 * Saves the returned API key to the database for use by all subsequent broker calls.
	 * Throws `BrokerAlreadyRegisteredError` (409) if the instance is already registered.
	 */
	async registerInstance(
		instanceId: string,
		instanceBaseUrl: string,
		consumerId: string,
	): Promise<string> {
		this.logger.debug('Registering instance with broker', { instanceId });

		const url = `${this.getBrokerUrl()}/keys/register`;
		let resp: Response;
		try {
			resp = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Instance-Hash': this.deriveRegistrationHash(instanceId, consumerId),
				},
				body: JSON.stringify({ instanceId, instanceBaseUrl, consumerId }),
			});
		} catch (e) {
			throw new BrokerUnavailableError(`Broker unreachable at ${url}: ${(e as Error).message}`);
		}

		if (resp.status === 401) {
			throw new BrokerError('Broker registration hash is invalid');
		}
		if (resp.status === 409) {
			throw new BrokerAlreadyRegisteredError(
				'Instance is already registered with broker – use rotateKey to issue a new key',
			);
		}
		if (!resp.ok) {
			throw new BrokerError(`Broker registration failed with status ${resp.status}`);
		}

		const body = (await resp.json()) as { apiKey: string };
		await this.settingsRepository.upsert(
			{ key: BROKER_API_KEY_SETTING, value: body.apiKey, loadOnStartup: false },
			['key'],
		);
		this.logger.debug('Instance registered successfully', { instanceId });
		return body.apiKey;
	}

	/**
	 * Starts a broker-managed OAuth flow.
	 * Returns the `authUrl` the user should be redirected to.
	 */
	async startFlow({
		provider,
		flowId,
		instanceBaseUrl,
		scopes,
		authQueryParameters,
	}: {
		provider: string;
		flowId: string;
		instanceBaseUrl: string;
		scopes?: string[];
		authQueryParameters?: Record<string, string>;
	}): Promise<string> {
		this.logger.debug('Starting OAuth flow', { provider, flowId });

		const url = `${this.getBrokerUrl()}/flow/start`;
		const apiKey = await this.getBrokerApiKey();
		let resp: Response;
		try {
			resp = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
				body: JSON.stringify({ provider, flowId, instanceBaseUrl, scopes, authQueryParameters }),
			});
		} catch (e) {
			throw new BrokerUnavailableError(`Broker unreachable at ${url}: ${(e as Error).message}`);
		}

		if (!resp.ok) {
			throw new BrokerError(`Broker startFlow failed with status ${resp.status}`);
		}

		const body = (await resp.json()) as { authUrl: string };
		this.logger.debug('OAuth flow started', { provider, flowId });
		return body.authUrl;
	}

	/**
	 * Retrieves tokens from the broker using the `retrievalCode` returned in the callback.
	 * Throws `BrokerTokenNotReadyError` (404) if tokens are not yet available.
	 * Throws `BrokerTokenExpiredError` (410) if the pickup window has closed.
	 */
	async retrieveTokens(retrievalCode: string): Promise<TokenSet> {
		this.logger.debug('Retrieving tokens from broker');

		const url = `${this.getBrokerUrl()}/tokens/${encodeURIComponent(retrievalCode)}`;
		const apiKey = await this.getBrokerApiKey();
		let resp: Response;
		try {
			resp = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
		} catch (e) {
			throw new BrokerUnavailableError(`Broker unreachable at ${url}: ${(e as Error).message}`);
		}

		if (resp.status === 401) {
			throw new BrokerError('Broker API key is missing or invalid');
		}
		if (resp.status === 404) {
			throw new BrokerTokenNotReadyError('Token not yet available from broker');
		}
		if (resp.status === 410) {
			throw new BrokerTokenExpiredError('Broker token pickup window has expired');
		}
		if (!resp.ok) {
			throw new BrokerError(`Broker retrieveTokens failed with status ${resp.status}`);
		}

		this.logger.debug('Tokens retrieved successfully');
		return (await resp.json()) as TokenSet;
	}

	/**
	 * Refreshes an access token via the broker.
	 * Throws `BrokerRefreshRejectedError` (401) if the refresh token is invalid – user must reconnect.
	 * Throws `BrokerUnavailableError` (502) if the broker is temporarily unreachable.
	 */
	async refreshToken({
		provider,
		refreshToken: token,
		scopes,
	}: {
		provider: string;
		refreshToken: string;
		scopes?: string[];
	}): Promise<TokenSet> {
		this.logger.debug('Refreshing token via broker', { provider });

		const url = `${this.getBrokerUrl()}/token/refresh`;
		const apiKey = await this.getBrokerApiKey();
		let resp: Response;
		try {
			resp = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
				body: JSON.stringify({ provider, refreshToken: token, scopes }),
			});
		} catch (e) {
			throw new BrokerUnavailableError(`Broker unreachable at ${url}: ${(e as Error).message}`);
		}

		if (resp.status === 401) {
			throw new BrokerRefreshRejectedError('Broker rejected refresh token – user must reconnect');
		}
		if (resp.status === 502) {
			throw new BrokerUnavailableError('Broker is temporarily unavailable');
		}
		if (!resp.ok) {
			throw new BrokerError(`Broker refreshToken failed with status ${resp.status}`);
		}

		this.logger.debug('Token refreshed successfully', { provider });
		return (await resp.json()) as TokenSet;
	}
}
