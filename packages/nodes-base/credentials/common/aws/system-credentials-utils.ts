import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { ApplicationError } from 'n8n-workflow';

type Resolvers = 'environment' | 'podIdentity' | 'containerMetadata' | 'instanceMetadata';
type RetrunData = {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
};

export const envGetter = (key: string): string | undefined => process.env[key];

export const credentialsResolver: Record<Resolvers, () => Promise<RetrunData | null>> = {
	environment: getEnvironmentCredentials,
	instanceMetadata: getInstanceMetadataCredentials,
	containerMetadata: getContainerMetadataCredentials,
	podIdentity: getPodIdentityCredentials,
};

/**
 * Retrieves AWS credentials from various system sources following the AWS credential chain.
 * Attempts to get credentials in the following order:
 * 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)
 * 2. EKS Pod Identity (AWS_CONTAINER_CREDENTIALS_FULL_URI)
 * 3. ECS/Fargate container metadata (AWS_CONTAINER_CREDENTIALS_RELATIVE_URI)
 * 4. EC2 instance metadata service
 */
export async function getSystemCredentials() {
	if (!Container.get(SecurityConfig).awsSystemCredentialsAccess) {
		throw new ApplicationError(
			'Access to AWS system credentials disabled, contact your administrator.',
		);
	}

	const resolveOrder: Resolvers[] = [
		'environment',
		'podIdentity',
		'containerMetadata',
		'instanceMetadata',
	];

	for (const resolver of resolveOrder) {
		try {
			const credentials = await credentialsResolver[resolver]();
			if (credentials) return { ...credentials, source: resolver };
		} catch (error) {
			// Ignore and continue to the next resolver
		}
	}

	return null;
}

async function getEnvironmentCredentials() {
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
 * When AWS_CONTAINER_AUTHORIZATION_TOKEN is available, it includes the Authorization header
 * as required by AWS for Pod Identity credential endpoints.
 *
 * @returns Promise resolving to credentials object or null if not running with EKS Pod Identity
 *
 * @see {@link https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html EKS Pod Identities}
 */
async function getPodIdentityCredentials() {
	const fullUri = envGetter('AWS_CONTAINER_CREDENTIALS_FULL_URI');
	if (!fullUri) {
		return null;
	}

	try {
		const authToken = envGetter('AWS_CONTAINER_AUTHORIZATION_TOKEN');
		const headers: Record<string, string> = {
			'User-Agent': 'n8n-aws-credential',
		};

		if (authToken) {
			headers.Authorization = `Bearer ${authToken}`;
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
