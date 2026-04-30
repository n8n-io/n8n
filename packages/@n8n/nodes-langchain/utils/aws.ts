import type {
	AwsAssumeRoleCredentialsType,
	AwsIamCredentialsType,
} from 'n8n-nodes-base/dist/credentials/common/aws/types';
import { assumeRole } from 'n8n-nodes-base/dist/credentials/common/aws/utils';
import { awsNodeCredentials, awsNodeAuthOptions } from 'n8n-nodes-base/dist/nodes/Aws/utils';

import type { ISupplyDataFunctions } from 'n8n-workflow';

export { awsNodeCredentials, awsNodeAuthOptions };

export type AwsResolvedCredentials = {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
};

export async function resolveAwsCredentials(
	context: ISupplyDataFunctions,
	itemIndex: number,
): Promise<{ region: string; credentials: AwsResolvedCredentials }> {
	const authentication = context.getNodeParameter('authentication', itemIndex, 'iam') as
		| 'iam'
		| 'assumeRole';

	if (authentication === 'assumeRole') {
		const creds = await context.getCredentials<AwsAssumeRoleCredentialsType>('awsAssumeRole');
		return {
			region: creds.region,
			credentials: await assumeRole(creds, creds.region),
		};
	}

	const creds = await context.getCredentials<AwsIamCredentialsType>('aws');
	return {
		region: creds.region,
		credentials: {
			accessKeyId: creds.accessKeyId,
			secretAccessKey: creds.secretAccessKey,
			...(creds.temporaryCredentials && creds.sessionToken
				? { sessionToken: creds.sessionToken }
				: {}),
		},
	};
}
