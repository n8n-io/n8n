import { Service } from '@n8n/di';
import type {
	IDataObject,
	IExecutionContext,
	IRunExecutionData,
	ISecureArtifactsV1,
} from 'n8n-workflow';

export type RuntimeCredentialValues = ISecureArtifactsV1['artifacts'];

export interface RuntimeCredentialProvider {
	getRuntimeCredential(
		runExecutionData: IRunExecutionData,
		alias: string,
	): Promise<IDataObject[string] | undefined>;

	/** All values the trigger stored for this execution, keyed by alias. Empty when there are none. */
	getRuntimeCredentials(
		executionContext: IExecutionContext | undefined,
	): Promise<RuntimeCredentialValues>;
}

@Service()
export class RuntimeCredentialProxyService implements RuntimeCredentialProvider {
	private provider: RuntimeCredentialProvider | null = null;

	registerProvider(provider: RuntimeCredentialProvider): void {
		this.provider = provider;
	}

	/** The provider is registered only while the runtime-credentials module is enabled. */
	isEnabled(): boolean {
		return this.provider !== null;
	}

	async getRuntimeCredential(
		runExecutionData: IRunExecutionData,
		alias: string,
	): Promise<IDataObject[string] | undefined> {
		if (this.provider) {
			return await this.provider.getRuntimeCredential(runExecutionData, alias);
		}
		return undefined;
	}

	async getRuntimeCredentials(
		executionContext: IExecutionContext | undefined,
	): Promise<RuntimeCredentialValues> {
		if (this.provider) {
			return await this.provider.getRuntimeCredentials(executionContext);
		}
		return {};
	}
}
