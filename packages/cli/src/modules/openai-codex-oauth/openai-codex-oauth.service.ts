import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { OnShutdown } from '@n8n/decorators';
import { Credentials } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';
import pkceChallenge from 'pkce-challenge';

import { startCallbackListener, type CallbackListener } from './callback-listener';
import {
	buildAuthorizationUrl,
	exchangeAuthorizationCode,
	parseAuthorizationInput,
	type CodexCredentials,
} from './codex-oauth';
import {
	CACHE_KEY_PREFIX,
	CODEX_CREDENTIAL_TYPE,
	FLOW_TTL_SECONDS,
} from './openai-codex-oauth.constants';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CacheService } from '@/services/cache/cache.service';

/** Per-flow state. The verifier never leaves the backend. */
interface CodexFlowState {
	state: string;
	verifier: string;
	credentialId: string;
	userId: string;
}

export interface StartFlowResult {
	flowId: string;
	authUrl: string;
	/**
	 * Whether the backend captured the loopback callback itself. When false the
	 * user must paste the redirect URL back — the only option when n8n does not
	 * share a host with the browser (containers, remote instances).
	 */
	listening: boolean;
}

@Service()
export class OpenAiCodexOAuthService {
	/** Live loopback listeners, keyed by flow id. */
	private readonly listeners = new Map<string, CallbackListener>();

	constructor(
		private readonly logger: Logger,
		private readonly cacheService: CacheService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsRepository: CredentialsRepository,
	) {}

	private cacheKey(flowId: string): string {
		return `${CACHE_KEY_PREFIX}:${flowId}`;
	}

	/**
	 * Resolves the credential the flow targets, enforcing that the user may
	 * actually write to it before any token is minted.
	 */
	private async resolveCredential(credentialId: string, user: User): Promise<CredentialsEntity> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:update'],
		);

		if (!credential) {
			throw new UserError('You do not have permission to connect this credential.', {
				level: 'warning',
			});
		}

		if (credential.type !== CODEX_CREDENTIAL_TYPE) {
			throw new UserError(`Credential "${credential.name}" is not a Codex OAuth credential.`, {
				level: 'warning',
			});
		}

		return credential;
	}

	async startFlow(credentialId: string, user: User): Promise<StartFlowResult> {
		await this.resolveCredential(credentialId, user);

		const { code_verifier: verifier, code_challenge: codeChallenge } = await pkceChallenge();
		const state = randomBytes(32).toString('hex');
		const flowId = randomBytes(16).toString('hex');

		await this.cacheService.set(
			this.cacheKey(flowId),
			{ state, verifier, credentialId, userId: user.id } satisfies CodexFlowState,
			FLOW_TTL_SECONDS * 1000,
		);

		const authUrl = buildAuthorizationUrl({ state, codeChallenge });

		const listener = await startCallbackListener(state, FLOW_TTL_SECONDS * 1000);
		if (listener) {
			this.listeners.set(flowId, listener);
			// The result is awaited by `completeFlow`; swallow rejections here so a
			// timeout or a cancelled sign-in never surfaces as an unhandled rejection.
			listener.result.catch(() => {});
		} else {
			this.logger.debug(
				'Codex OAuth callback port unavailable; falling back to manual redirect entry',
			);
		}

		return { flowId, authUrl, listening: listener !== null };
	}

	async completeFlow(
		flowId: string,
		user: User,
		redirectInput?: string,
	): Promise<{ credentialId: string }> {
		const key = this.cacheKey(flowId);
		const flow = await this.cacheService.get<CodexFlowState>(key);

		if (!flow) {
			throw new UserError('This Codex sign-in has expired. Start the connection again.', {
				level: 'warning',
			});
		}

		// Consume-once: a code must never be replayable, whatever happens below.
		await this.cacheService.delete(key);

		const listener = this.listeners.get(flowId);
		this.listeners.delete(flowId);

		try {
			if (flow.userId !== user.id) {
				throw new UserError('This Codex sign-in belongs to a different user.', {
					level: 'warning',
				});
			}

			const credential = await this.resolveCredential(flow.credentialId, user);
			const code = await this.resolveCode(flow, listener, redirectInput);

			const credentials = await exchangeAuthorizationCode({ code, verifier: flow.verifier });

			await this.persist(credential, credentials);

			this.logger.info('Connected Codex OAuth credential', {
				credentialId: credential.id,
				userId: user.id,
			});

			return { credentialId: credential.id };
		} finally {
			listener?.close();
		}
	}

	/** Takes the code from the loopback listener, or from what the user pasted. */
	private async resolveCode(
		flow: CodexFlowState,
		listener: CallbackListener | undefined,
		redirectInput?: string,
	): Promise<string> {
		if (redirectInput) {
			const parsed = parseAuthorizationInput(redirectInput);
			if (!parsed.code) {
				throw new UserError(
					'No authorization code was found in what you pasted. Copy the full address the browser was redirected to.',
					{ level: 'warning' },
				);
			}
			// A bare code carries no state; only compare when one was supplied.
			if (parsed.state !== undefined && parsed.state !== flow.state) {
				throw new UserError('The sign-in state did not match. Start the connection again.', {
					level: 'warning',
				});
			}
			return parsed.code;
		}

		if (!listener) {
			throw new UserError(
				'Paste the address the browser was redirected to in order to finish connecting.',
				{ level: 'warning' },
			);
		}

		return await listener.result;
	}

	/**
	 * Writes the tokens onto the credential, preserving whatever else it holds
	 * (such as a custom base URL).
	 */
	private async persist(credential: CredentialsEntity, data: CodexCredentials): Promise<void> {
		const credentials = new Credentials(credential, credential.type, credential.data);
		await credentials.updateData(data);
		await this.credentialsRepository.update(credential.id, {
			...credentials.getDataToSave(),
			updatedAt: new Date(),
		});
	}

	@OnShutdown()
	shutdown(): void {
		for (const listener of this.listeners.values()) listener.close();
		this.listeners.clear();
	}
}
