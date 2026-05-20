import { Service } from '@n8n/di';
import type { IDataObject, IRunExecutionData } from 'n8n-workflow';

export interface RuntimeCredentialProvider {
	getRuntimeCredentials(
		runExecutionData: IRunExecutionData,
		alias: string,
	): Promise<IDataObject[string] | undefined>;
}

@Service()
export class RuntimeCredentialProxyService implements RuntimeCredentialProvider {
	private provider: RuntimeCredentialProvider | null = null;

	registerProvider(provider: RuntimeCredentialProvider): void {
		this.provider = provider;
	}

	async getRuntimeCredentials(
		runExecutionData: IRunExecutionData,
		alias: string,
	): Promise<IDataObject[string] | undefined> {
		if (this.provider) {
			return await this.provider.getRuntimeCredentials(runExecutionData, alias);
		}
		return undefined;
	}
}
