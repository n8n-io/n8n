import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { IDataObject, IRunExecutionData } from 'n8n-workflow';
import { toSecureArtifacts } from 'n8n-workflow';

import { InboundSecretProvider } from '@/services/inbound-secret-proxy.service';

@Service()
export class InboundSecretsAccessService implements InboundSecretProvider {
	constructor(private readonly cipher: Cipher) {}

	async getInboundArtifacts(
		runExecutionData: IRunExecutionData,
		nodeName: string,
		path: string,
		itemIndex: number,
	): Promise<IDataObject[string] | undefined> {
		const secureArtifacts = runExecutionData.executionData?.runtimeData?.secureArtifacts;

		if (typeof secureArtifacts === 'string') {
			const decryptedSecureArtifacts = await this.cipher.decryptV2(secureArtifacts);
			const parsedSecureArtifacts = toSecureArtifacts(decryptedSecureArtifacts);

			return parsedSecureArtifacts.artifacts[nodeName]?.[itemIndex]?.[path];
		}
		return undefined;
	}
}
