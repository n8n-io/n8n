import { Service } from '@n8n/di';
import type { Inbound } from '@n8n/inbound-auth';
import {
	UnexpectedError,
	type N8nOAuth2FlowResult,
	type N8nOAuth2RefreshResult,
} from 'n8n-workflow';

/** What the surface knows of the callback request, carried into the verified result. */
export type OAuth2FlowRequest = Pick<Inbound['request'], 'method' | 'url' | 'ip'>;

/**
 * The redirect login of first-party trigger resources. `begin` and `complete` run the
 * authorization-code flow against a trusted source: the instance's own OAuth2 server
 * with a per-trigger virtual client, or an external issuer with a registered client.
 * `refresh` rotates the grant at the same source. A registered (DCR) client of the
 * internal server cannot use these methods — it goes through the public `/oauth/token`
 * endpoint instead.
 */
export interface N8nOAuth2Flow {
	begin(resourceUrl: string, metadata?: Record<string, string>): Promise<string>;
	complete(code: string, state: string, request?: OAuth2FlowRequest): Promise<N8nOAuth2FlowResult>;
	refresh(refreshToken: string, resourceUrl: string): Promise<N8nOAuth2RefreshResult>;
}

@Service()
export class OAuth2FlowProxy implements N8nOAuth2Flow {
	private provider: N8nOAuth2Flow | null = null;

	registerProvider(provider: N8nOAuth2Flow): void {
		this.provider = provider;
	}

	async begin(resourceUrl: string, metadata?: Record<string, string>): Promise<string> {
		if (!this.provider) throw new UnexpectedError('OAuth2 trigger flow is not available');
		return await this.provider.begin(resourceUrl, metadata);
	}

	async complete(
		code: string,
		state: string,
		request?: OAuth2FlowRequest,
	): Promise<N8nOAuth2FlowResult> {
		if (!this.provider) throw new UnexpectedError('OAuth2 trigger flow is not available');
		return await this.provider.complete(code, state, request);
	}

	async refresh(refreshToken: string, resourceUrl: string): Promise<N8nOAuth2RefreshResult> {
		if (!this.provider) throw new UnexpectedError('OAuth2 trigger flow is not available');
		return await this.provider.refresh(refreshToken, resourceUrl);
	}
}
