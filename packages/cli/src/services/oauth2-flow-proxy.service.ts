import { Service } from '@n8n/di';
import { UnexpectedError, type N8nOAuth2FlowResult } from 'n8n-workflow';

export interface N8nOAuth2Flow {
	begin(resourceUrl: string): Promise<string>;
	complete(code: string, state: string): Promise<N8nOAuth2FlowResult>;
}

@Service()
export class OAuth2FlowProxy implements N8nOAuth2Flow {
	private provider: N8nOAuth2Flow | null = null;

	registerProvider(provider: N8nOAuth2Flow): void {
		this.provider = provider;
	}

	async begin(resourceUrl: string): Promise<string> {
		if (!this.provider) throw new UnexpectedError('OAuth2 form flow is not available');
		return await this.provider.begin(resourceUrl);
	}

	async complete(code: string, state: string): Promise<N8nOAuth2FlowResult> {
		if (!this.provider) throw new UnexpectedError('OAuth2 form flow is not available');
		return await this.provider.complete(code, state);
	}
}
