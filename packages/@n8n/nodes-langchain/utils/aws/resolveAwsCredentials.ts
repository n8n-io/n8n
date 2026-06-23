import { getNodeProxyAgent } from '@n8n/ai-utilities';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@smithy/types';
import type {
	AwsAssumeRoleCredentialsType,
	AwsIamCredentialsType,
	AWSRegion,
} from 'n8n-nodes-base/dist/credentials/common/aws/types';
import { getSystemCredentials } from 'n8n-nodes-base/dist/credentials/common/aws/system-credentials-utils';
import { UserError, type ISupplyDataFunctions } from 'n8n-workflow';

export type ResolvedAwsCredentials = {
	region: AWSRegion;
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
};

export async function resolveAwsCredentials(
	context: ISupplyDataFunctions,
	itemIndex = 0,
): Promise<ResolvedAwsCredentials> {
	const authentication = context.getNodeParameter('authentication', itemIndex, 'iam') as
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
		throw new UserError('Role ARN is required when assuming a role.');
	}
	if (!creds.externalId || creds.externalId.trim() === '') {
		throw new UserError('External ID is required when assuming a role.');
	}
	if (!creds.roleSessionName || creds.roleSessionName.trim() === '') {
		throw new UserError('Role Session Name is required when assuming a role.');
	}

	let masterCredentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
	if (creds.useSystemCredentialsForRole) {
		masterCredentials = async () => {
			const sys = await getSystemCredentials();
			if (!sys) {
				throw new UserError(
					'System AWS credentials are required for role assumption. Please ensure AWS credentials are available via environment variables, instance metadata, or container role.',
				);
			}
			return {
				accessKeyId: sys.accessKeyId,
				secretAccessKey: sys.secretAccessKey,
				...(sys.sessionToken ? { sessionToken: sys.sessionToken } : {}),
			};
		};
	} else {
		if (!creds.stsAccessKeyId || creds.stsAccessKeyId.trim() === '') {
			throw new UserError('STS Access Key ID is required when not using system credentials.');
		}
		if (!creds.stsSecretAccessKey || creds.stsSecretAccessKey.trim() === '') {
			throw new UserError('STS Secret Access Key is required when not using system credentials.');
		}
		masterCredentials = {
			accessKeyId: creds.stsAccessKeyId.trim(),
			secretAccessKey: creds.stsSecretAccessKey.trim(),
			...(creds.stsSessionToken?.trim() ? { sessionToken: creds.stsSessionToken.trim() } : {}),
		};
	}

	const stsTarget = `https://sts.${creds.region}.amazonaws.com`;
	const proxyAgent = getNodeProxyAgent(stsTarget);
	const requestHandler = proxyAgent
		? new NodeHttpHandler({ httpAgent: proxyAgent, httpsAgent: proxyAgent })
		: undefined;

	// Lazy-load the AWS SDK so the ~1.5 MB umbrella (Cognito/SSO clients) isn't
	// pulled in at startup for workflows that never assume an AWS role.
	const { fromTemporaryCredentials } = await import('@aws-sdk/credential-providers');
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
