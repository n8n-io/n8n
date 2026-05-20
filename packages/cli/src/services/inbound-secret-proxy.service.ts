import { Service } from '@n8n/di';
import type { IDataObject, IRunExecutionData } from 'n8n-workflow';

export interface InboundSecretProvider {
	getInboundArtifacts(
		runExecutionData: IRunExecutionData,
		nodeName: string,
		path: string,
		itemIndex: number,
	): Promise<IDataObject[string] | undefined>;
}

@Service()
export class InboundSecretProxyService implements InboundSecretProvider {
	private provider: InboundSecretProvider | null = null;

	registerProvider(provider: InboundSecretProvider): void {
		this.provider = provider;
	}

	async getInboundArtifacts(
		runExecutionData: IRunExecutionData,
		nodeName: string,
		path: string,
		itemIndex: number,
	): Promise<IDataObject[string] | undefined> {
		if (this.provider) {
			return await this.provider.getInboundArtifacts(runExecutionData, nodeName, path, itemIndex);
		}
		return undefined;
	}
}
