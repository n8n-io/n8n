import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { readFile } from 'fs/promises';

import { getAwsDomain, type AWSRegion } from './regions';
import {
	resolveContainerMetadataViaSdk,
	resolveEnvironmentViaSdk,
	resolveInstanceMetadataViaSdk,
	resolvePodIdentityViaSdk,
	resolveWebIdentityViaSdk,
	usesSdk,
} from './system-credentials-sdk';

export type Resolvers =
	| 'environment'
	| 'roleForServiceAccount'
	| 'podIdentity'
	| 'containerMetadata'
	| 'instanceMetadata';
type ReturnData = {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
};

export const envGetter = (key: string): string | undefined => process.env[key];

// Region-independent AWS credential providers, keyed by source.
// `roleForServiceAccount` is excluded here because it needs the region to build
// the regional STS endpoint; it's bound into the chain in `getSystemCredentials`.
export const credentialsResolver: Record<
	Exclude<Resolvers, 'roleForServiceAccount'>,
	() => Promise<ReturnData | null>
> = {
	environment: getEnvironmentCredentials,
	podIdentity: getPodIdentityCredentials,
	containerMetadata: getContainerMetadataCredentials,
	instanceMetadata: getInstanceMetadataCredentials,
};

/**
 * Retrieves AWS credentials from various system sources following the AWS credential chain.
 * Attempts to get credentials in the following order:
 * 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)
 * 2. IAM Role for Service Account (AWS_ROLE_ARN + AWS_WEB_IDENTITY_TOKEN_FILE)
 * 3. EKS Pod Identity (AWS_CONTAINER_CREDENTIALS_FULL_URI)
 * 4. ECS/Fargate container metadata (AWS_CONTAINER_CREDENTIALS_RELATIVE_URI)
 * 5. EC2 instance metadata service
 */
export async function getSystemCredentials(region: AWSRegion) {
	if (!Container.get(SecurityConfig).awsSystemCredentialsAccess) {
		throw new UserError('Access to AWS system credentials disabled, contact your administrator.');
	}

	// Ordered AWS credential chain; the first provider to return credentials wins.
	// `roleForServiceAccount` is bound with the region for its regional STS endpoint.
	const chain: Array<{ source: Resolvers; resolve: () => Promise<ReturnData | null> }> = [
		{ source: 'environment', resolve: credentialsResolver.environment },
		{
			source: 'roleForServiceAccount',
			resolve: async () => await getRoleForServiceAccountCredentials(region),
		},
		{ source: 'podIdentity', resolve: credentialsResolver.podIdentity },
		{ source: 'containerMetadata', resolve: credentialsResolver.containerMetadata },
		{ source: 'instanceMetadata', resolve: credentialsResolver.instanceMetadata },
	];

	for (const { source, resolve } of chain) {
		try {
			const credentials = await resolve();
			if (credentials) return { ...credentials, source };
		} catch {
			// Provider unavailable in this environment; try the next one.
		}
	}

	return null;
}

async function getEnvironmentCredentials() {
	if (usesSdk('environment')) return await resolveEnvironmentViaSdk();

	const accessKeyId = envGetter('AWS_ACCESS_KEY_ID');
	const secretAccessKey = envGetter('AWS_SECRET_ACCESS_KEY');
	const sessionToken = envGetter('AWS_SESSION_TOKEN');

	if (accessKeyId && secretAccessKey) {
		return {
			accessKeyId: accessKeyId.trim(),
			secretAccessKey: secretAccessKey.trim(),
			sessionToken: sessionToken?.trim(),
		};
	}

	return null;
}

/**
 * Retrieves AWS credentials from EC2 instance metadata service (IMDSv2-aware).
 * This function is used when running on an EC2 instance with an attached IAM role.
 * It first attempts to obtain an IMDSv2 session token and includes it in all metadata requests.
 * Falls back to IMDSv1 if IMDSv2 is unavailable (older or less restricted environments).
 *
 * @returns Promise resolving to credentials object or null if not running on EC2 or no role attached
 *
 * @see {@link https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html IAM Roles for Amazon EC2}
 */
async function getInstanceMetadataCredentials() {
	if (usesSdk('instanceMetadata')) return await resolveInstanceMetadataViaSdk();

	try {
		const baseUrl = 'http://169.254.169.254/latest';
		const headers: Record<string, string> = {
			'User-Agent': 'n8n-aws-credential',
		};

		// Try to obtain an IMDSv2 token
		try {
			const tokenResponse = await fetch(`${baseUrl}/api/token`, {
				method: 'PUT',
				headers: {
					'X-aws-ec2-metadata-token-ttl-seconds': '21600',
					'User-Agent': 'n8n-aws-credential',
				},
				signal: AbortSignal.timeout(2000),
			});

			if (tokenResponse.ok) {
				const token = await tokenResponse.text();
				headers['X-aws-ec2-metadata-token'] = token;
			}
		} catch {
			// IMDSv2 may be disabled; continue with IMDSv1
		}

		const roleResponse = await fetch(`${baseUrl}/meta-data/iam/security-credentials/`, {
			method: 'GET',
			headers,
			signal: AbortSignal.timeout(2000),
		});

		if (!roleResponse.ok) {
			return null;
		}

		const roleName = (await roleResponse.text()).trim();
		if (!roleName) {
			return null;
		}

		const credentialsResponse = await fetch(
			`${baseUrl}/meta-data/iam/security-credentials/${roleName}`,
			{
				method: 'GET',
				headers,
				signal: AbortSignal.timeout(2000),
			},
		);

		if (!credentialsResponse.ok) {
			return null;
		}

		const credentialsData = await credentialsResponse.json();

		if (!credentialsData?.AccessKeyId || !credentialsData?.SecretAccessKey) {
			return null;
		}

		return {
			accessKeyId: credentialsData.AccessKeyId,
			secretAccessKey: credentialsData.SecretAccessKey,
			sessionToken: credentialsData.Token,
		};
	} catch (error) {
		return null;
	}
}

/**
 * Retrieves AWS credentials from ECS/Fargate container metadata service.
 * This function is used when running in an ECS task or Fargate container with a task role.
 * It uses the AWS_CONTAINER_CREDENTIALS_RELATIVE_URI environment variable to fetch credentials.
 * When AWS_CONTAINER_AUTHORIZATION_TOKEN is available, it includes the Authorization header
 * as required by AWS for container credential endpoints.
 *
 * @returns Promise resolving to credentials object or null if not running in ECS/Fargate or no task role
 *
 * @see {@link https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html IAM Roles for Tasks}
 */
async function getContainerMetadataCredentials() {
	if (usesSdk('containerMetadata')) return await resolveContainerMetadataViaSdk();

	try {
		const relativeUri = envGetter('AWS_CONTAINER_CREDENTIALS_RELATIVE_URI');
		if (!relativeUri) {
			return null;
		}

		const authToken = envGetter('AWS_CONTAINER_AUTHORIZATION_TOKEN');
		const headers: Record<string, string> = {
			'User-Agent': 'n8n-aws-credential',
		};

		if (authToken) {
			headers.Authorization = `Bearer ${authToken}`;
		}

		const response = await fetch(`http://169.254.170.2${relativeUri}`, {
			method: 'GET',
			headers,
			signal: AbortSignal.timeout(2000),
		});

		if (!response.ok) {
			return null;
		}

		const credentialsData = await response.json();

		return {
			accessKeyId: credentialsData.AccessKeyId,
			secretAccessKey: credentialsData.SecretAccessKey,
			sessionToken: credentialsData.Token,
		};
	} catch (error) {
		return null;
	}
}

/**
 * Retrieves AWS credentials from EKS Pod Identity service.
 * This function is used when running in an EKS pod with Pod Identity configured.
 * It uses the AWS_CONTAINER_CREDENTIALS_FULL_URI environment variable to fetch credentials.
 * When AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE or AWS_CONTAINER_AUTHORIZATION_TOKEN is available,
 * it includes the Authorization header as required by AWS for Pod Identity credential endpoints.
 * The file-based token takes precedence over the direct token, following AWS SDK behavior.
 *
 * Unlike when retrieving AWS Credentials from Container Metadata for ECS/Fargate, the Authorization
 * header should NOT include a 'Bearer ' prefix as the EKS Pod Identity Agent uses the header value
 * directly when making the AssumeRoleForPodIdentity API call.
 *
 * @returns Promise resolving to credentials object or null if not running with EKS Pod Identity
 *
 * @see {@link https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html EKS Pod Identities}
 */
async function getPodIdentityCredentials() {
	if (usesSdk('podIdentity')) return await resolvePodIdentityViaSdk();

	const fullUri = envGetter('AWS_CONTAINER_CREDENTIALS_FULL_URI');
	if (!fullUri) {
		return null;
	}

	try {
		let authToken: string | undefined;

		// Check for file-based token first (used by EKS Pod Identity)
		const authTokenFile = envGetter('AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE');
		if (authTokenFile) {
			try {
				authToken = (await readFile(authTokenFile, 'utf-8')).trim();
			} catch (error) {
				// If file read fails, fall back to direct token
			}
		}

		// Fall back to direct token (used by ECS Task Roles)
		if (!authToken) {
			authToken = envGetter('AWS_CONTAINER_AUTHORIZATION_TOKEN');
		}

		const headers: Record<string, string> = {
			'User-Agent': 'n8n-aws-credential',
		};

		if (authToken) {
			headers.Authorization = `${authToken}`;
		}

		const response = await fetch(fullUri, {
			method: 'GET',
			headers,
			signal: AbortSignal.timeout(2000),
		});

		if (!response.ok) {
			return null;
		}

		const credentialsData = await response.json();

		return {
			accessKeyId: credentialsData.AccessKeyId,
			secretAccessKey: credentialsData.SecretAccessKey,
			sessionToken: credentialsData.Token,
		};
	} catch (error) {
		return null;
	}
}

/**
 * Retrieves AWS credentials by assuming a role via OIDC web identity (IRSA).
 * Used when running in EKS with IAM Roles for Service Accounts configured.
 * Reads the OIDC token from the file at AWS_WEB_IDENTITY_TOKEN_FILE and calls
 * STS AssumeRoleWithWebIdentity to exchange it for temporary credentials.
 *
 * @returns Promise resolving to credentials object or null if IRSA is not configured
 *
 * @see {@link https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html IRSA}
 * @see {@link https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html STS API}
 * @see {@link https://github.com/aws/aws-sdk-js-v3/blob/main/packages-internal/credential-provider-web-identity/src/fromWebToken.ts AWS SDK v3 implementation}
 */
export async function getRoleForServiceAccountCredentials(region: AWSRegion) {
	if (usesSdk('roleForServiceAccount')) return await resolveWebIdentityViaSdk(region);

	const iamRole = envGetter('AWS_ROLE_ARN');
	const webIdentityTokenFile = envGetter('AWS_WEB_IDENTITY_TOKEN_FILE');

	try {
		if (!iamRole || !webIdentityTokenFile) {
			return null;
		}

		const token = (await readFile(webIdentityTokenFile, 'utf8')).trim();
		if (!token) {
			return null;
		}

		const headers: Record<string, string> = {
			'User-Agent': 'n8n-aws-credential',
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
		};

		const body = new URLSearchParams({
			Action: 'AssumeRoleWithWebIdentity',
			RoleArn: iamRole,
			RoleSessionName: 'n8n-web-identity-session',
			WebIdentityToken: token,
			Version: '2011-06-15',
		});

		// Regional STS endpoint so EKS/IRSA works in standard, China (.com.cn) and GovCloud regions.
		// STS supports Accept: application/json (undocumented) to return JSON instead of XML.
		const credentialsResponse = await fetch(`https://sts.${region}.${getAwsDomain(region)}`, {
			method: 'POST',
			headers,
			body: body.toString(),
			signal: AbortSignal.timeout(2000),
		});

		if (!credentialsResponse.ok) {
			return null;
		}

		const data = await credentialsResponse.json();
		const credentialsData =
			data?.AssumeRoleWithWebIdentityResponse?.AssumeRoleWithWebIdentityResult?.Credentials;

		if (!credentialsData || !credentialsData.AccessKeyId || !credentialsData.SecretAccessKey) {
			return null;
		}

		return {
			accessKeyId: credentialsData.AccessKeyId,
			secretAccessKey: credentialsData.SecretAccessKey,
			sessionToken: credentialsData.SessionToken,
		};
	} catch (error) {
		return null;
	}
}
