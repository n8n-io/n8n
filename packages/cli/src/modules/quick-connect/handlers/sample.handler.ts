import { Service } from '@n8n/di';
import { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { IQuickConnectHandler } from './quick-connect.handler';
import { QuickConnectOption } from '../quick-connect.config';

// TODO: remove this SampleHandler. This is just an example for testing
@Service()
export class SampleHandler implements IQuickConnectHandler {
	credentialType = 'httpBearerAuth';

	getCredentialData?(config: QuickConnectOption): Promise<ICredentialDataDecryptedObject> {
		const value = 'foo-123';
		console.log(
			`Creating a sample HTTP Bearer Auth credential with ${value} as the token. Received ${config.backendFlowConfig?.secret} secret`,
		);
		return Promise.resolve({
			token: value,
		});
	}
}
