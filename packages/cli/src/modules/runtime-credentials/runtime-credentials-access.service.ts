import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { IDataObject, IExecutionContext, IRunExecutionData } from 'n8n-workflow';
import { toSecureArtifacts } from 'n8n-workflow';

import { RuntimeCredentialProvider, type RuntimeCredentialValues } from '@n8n/backend-services';

@Service()
export class RuntimeCredentialsAccessService implements RuntimeCredentialProvider {
	constructor(private readonly cipher: Cipher) {}

	async getRuntimeCredential(
		runExecutionData: IRunExecutionData,
		alias: string,
	): Promise<IDataObject[string] | undefined> {
		const artifacts = await this.decrypt(runExecutionData.executionData?.runtimeData);
		return artifacts?.[alias];
	}

	async getRuntimeCredentials(
		executionContext: IExecutionContext | undefined,
	): Promise<RuntimeCredentialValues> {
		return (await this.decrypt(executionContext)) ?? {};
	}

	private async decrypt(
		executionContext: IExecutionContext | undefined,
	): Promise<RuntimeCredentialValues | undefined> {
		const secureArtifacts = executionContext?.secureArtifacts;
		if (typeof secureArtifacts !== 'string') return undefined;

		const decryptedSecureArtifacts = await this.cipher.decryptV2(secureArtifacts);
		return toSecureArtifacts(decryptedSecureArtifacts).artifacts;
	}
}
