import { getNodeProxyAgent } from '@n8n/ai-utilities';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@smithy/types';
import type {
	AwsAssumeRoleCredentialsType,
	AwsIamCredentialsType,
	AWSRegion,
} from 'n8n-nodes-base/dist/credentials/common/aws/types';
import { ApplicationError, type ISupplyDataFunctions } from 'n8n-workflow';

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

	const creds = (await context.getCredentials('awsAssumeRole')) as AwsAssumeRoleCredentialsType;

	if (!creds.roleArn || creds.roleArn.trim() === '') {
		throw new ApplicationError('Role ARN is required when assuming a role.');
	}
	if (!creds.externalId || creds.externalId.trim() === '') {
		throw new ApplicationError('External ID is required when assuming a role.');
	}
	if (!creds.roleSessionName || creds.roleSessionName.trim() === '') {
		throw new ApplicationError('Role Session Name is required when assuming a role.');
	}

	const masterCredentials: AwsCredentialIdentity = {
		accessKeyId: creds.stsAccessKeyId!.trim(),
		secretAccessKey: creds.stsSecretAccessKey!.trim(),
		...(creds.stsSessionToken?.trim() ? { sessionToken: creds.stsSessionToken.trim() } : {}),
	};

	const stsTarget = `https://sts.${creds.region}.amazonaws.com`;
	const proxyAgent = getNodeProxyAgent(stsTarget);
	const requestHandler = proxyAgent
		? new NodeHttpHandler({ httpAgent: proxyAgent, httpsAgent: proxyAgent })
		: undefined;

	const provider = fromTemporaryCredentials({
		params: {
			RoleArn: creds.roleArn.trim(),
			RoleSessionName: creds.roleSessionName.trim(),
			ExternalId: creds.externalId.trim(),
		},
		masterCredentials,
		clientConfig: {
			region: creds.region,
			...(requestHandler ? { requestHandler } : {}),
		},
	});

	return { region: creds.region, credentials: provider };
}
