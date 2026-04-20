import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@smithy/types';
import type {
	AwsIamCredentialsType,
	AWSRegion,
} from 'n8n-nodes-base/dist/credentials/common/aws/types';
import type { ISupplyDataFunctions } from 'n8n-workflow';

export type ResolvedAwsCredentials = {
	region: AWSRegion;
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
};

export async function resolveAwsCredentials(
	context: ISupplyDataFunctions,
): Promise<ResolvedAwsCredentials> {
	const authentication = context.getNodeParameter('authentication', 0, 'iam') as
		| 'iam'
		| 'assumeRole';

	if (authentication !== 'assumeRole') {
		const creds = (await context.getCredentials('aws')) as AwsIamCredentialsType;
		const identity: AwsCredentialIdentity = {
			accessKeyId: creds.accessKeyId,
			secretAccessKey: creds.secretAccessKey,
			...(creds.temporaryCredentials && creds.sessionToken
				? { sessionToken: creds.sessionToken }
				: {}),
		};
		return { region: creds.region, credentials: identity };
	}

	// AssumeRole branch populated in the next task.
	throw new Error('assumeRole branch not yet implemented');
}
