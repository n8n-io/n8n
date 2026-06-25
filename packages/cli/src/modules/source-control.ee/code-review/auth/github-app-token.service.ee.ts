import { Service } from '@n8n/di';
import jwt from 'jsonwebtoken';
import { OperationalError, UserError } from 'n8n-workflow';

export interface InstallationTokenParams {
	apiBaseUrl: string;
	appId: string;
	privateKey: string;
	owner: string;
	repo: string;
}

interface CachedToken {
	token: string;
	/** Epoch ms when GitHub expires the installation token. */
	expiresAt: number;
	installationId: number;
}

/** Refresh the installation token once it is within this window of expiring. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Mints short-lived GitHub App installation tokens for the code-review API.
 *
 * Flow: sign an RS256 JWT with the App's private key → discover the installation
 * for the target repo → exchange the JWT for a ~1h installation access token.
 * Tokens (and the discovered installation id) are cached in memory per
 * App+repo and reused until shortly before they expire.
 */
@Service()
export class GitHubAppTokenService {
	private readonly cache = new Map<string, CachedToken>();

	async getInstallationToken(params: InstallationTokenParams): Promise<string> {
		const cacheKey = `${params.appId}:${params.owner}/${params.repo}`;
		const cached = this.cache.get(cacheKey);
		if (cached && cached.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
			return cached.token;
		}

		const appJwt = this.createAppJwt(params.appId, params.privateKey);
		// Reuse a previously discovered installation id to save a request.
		const installationId = cached?.installationId ?? (await this.getInstallationId(params, appJwt));
		const { token, expiresAt } = await this.mintInstallationToken(
			params.apiBaseUrl,
			installationId,
			appJwt,
		);

		this.cache.set(cacheKey, { token, expiresAt, installationId });
		return token;
	}

	private createAppJwt(appId: string, privateKey: string): string {
		const nowSec = Math.floor(Date.now() / 1000);
		try {
			// iat back-dated 60s to tolerate clock skew; GitHub caps app JWT lifetime at 10 min.
			return jwt.sign({ iat: nowSec - 60, exp: nowSec + 540, iss: appId }, privateKey, {
				algorithm: 'RS256',
			});
		} catch (error) {
			throw new UserError(
				'Could not sign a token with the GitHub App private key. Check that it is a valid PEM private key.',
				{ cause: error },
			);
		}
	}

	private async request<T>(
		url: string,
		appJwt: string,
		init?: RequestInit,
	): Promise<{ status: number; body: T }> {
		let response: Response;
		try {
			response = await fetch(url, {
				...init,
				/* eslint-disable @typescript-eslint/naming-convention -- HTTP header names */
				headers: {
					Authorization: `Bearer ${appJwt}`,
					Accept: 'application/vnd.github+json',
					'X-GitHub-Api-Version': '2022-11-28',
					'User-Agent': 'n8n',
				},
				/* eslint-enable @typescript-eslint/naming-convention */
			});
		} catch (error) {
			throw new OperationalError('Failed to reach the GitHub API', { cause: error });
		}

		if (response.status === 401 || response.status === 403) {
			throw new UserError(
				'GitHub App credentials were rejected, or the App is not installed on this repository.',
			);
		}
		if (response.status >= 500) {
			throw new OperationalError(`GitHub API returned ${response.status}`);
		}

		const body = (await response.json().catch(() => ({}))) as T;
		return { status: response.status, body };
	}

	private async getInstallationId(
		params: InstallationTokenParams,
		appJwt: string,
	): Promise<number> {
		const { status, body } = await this.request<{ id?: number }>(
			`${params.apiBaseUrl}/repos/${params.owner}/${params.repo}/installation`,
			appJwt,
		);
		if (status === 404) {
			throw new UserError('The GitHub App is not installed on this repository.');
		}
		if (!body?.id) {
			throw new OperationalError('GitHub did not return an installation id');
		}
		return body.id;
	}

	private async mintInstallationToken(
		apiBaseUrl: string,
		installationId: number,
		appJwt: string,
	): Promise<{ token: string; expiresAt: number }> {
		const { body } = await this.request<{ token?: string; expires_at?: string }>(
			`${apiBaseUrl}/app/installations/${installationId}/access_tokens`,
			appJwt,
			{ method: 'POST' },
		);
		if (!body?.token) {
			throw new OperationalError('GitHub did not return an installation token');
		}
		return {
			token: body.token,
			expiresAt: body.expires_at ? new Date(body.expires_at).getTime() : Date.now() + 3_600_000,
		};
	}
}
