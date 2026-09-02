import { Service } from '@n8n/di';
import {
	UnexpectedError,
	type N8nOAuth2FlowResult,
	type N8nOAuth2RefreshResult,
} from 'n8n-workflow';

/**
 * The in-process OAuth2 flow for first-party trigger resources. Every method resolves a
 * virtual client from the resource URL, where client_id = redirect_uri = the trigger URL.
 * A registered (DCR) client cannot use these methods — it goes through the public
 * `/oauth/token` endpoint instead.
 */
export interface N8nOAuth2Flow {
	begin(resourceUrl: string, metadata?: Record<string, string>): Promise<string>;
	complete(code: string, state: string): Promise<N8nOAuth2FlowResult>;
	refreshVirtualClientToken(
		refreshToken: string,
		resourceUrl: string,
	): Promise<N8nOAuth2RefreshResult>;
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

	async complete(code: string, state: string): Promise<N8nOAuth2FlowResult> {
		if (!this.provider) throw new UnexpectedError('OAuth2 trigger flow is not available');
		return await this.provider.complete(code, state);
	}

	async refreshVirtualClientToken(
		refreshToken: string,
		resourceUrl: string,
	): Promise<N8nOAuth2RefreshResult> {
		if (!this.provider) throw new UnexpectedError('OAuth2 trigger flow is not available');
		return await this.provider.refreshVirtualClientToken(refreshToken, resourceUrl);
	}
}
