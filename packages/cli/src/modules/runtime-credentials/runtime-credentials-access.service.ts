import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { IDataObject, IRunExecutionData } from 'n8n-workflow';
import { toSecureArtifacts } from 'n8n-workflow';

import { RuntimeCredentialProvider } from '@/services/runtime-credential-proxy.service';

@Service()
export class RuntimeCredentialsAccessService implements RuntimeCredentialProvider {
	constructor(private readonly cipher: Cipher) {}

	async getRuntimeCredential(
		runExecutionData: IRunExecutionData,
		alias: string,
	): Promise<IDataObject[string] | undefined> {
		const secureArtifacts = runExecutionData.executionData?.runtimeData?.secureArtifacts;

		if (typeof secureArtifacts === 'string') {
			const decryptedSecureArtifacts = await this.cipher.decryptV2(secureArtifacts);
			const parsedSecureArtifacts = toSecureArtifacts(decryptedSecureArtifacts);

			return parsedSecureArtifacts.artifacts[alias];
		}
		return undefined;
	}
}
