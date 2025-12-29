import {
	fromIni,
	fromInstanceMetadata,
	fromContainerMetadata,
	fromTokenFile,
	fromNodeProviderChain,
} from '@aws-sdk/credential-providers';
import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import type { AwsCredentialIdentity } from '@aws-sdk/types';

/**
 * Credential source types supported by the AWS SDK v3.
 * Each source maps to a specific AWS SDK credential provider.
 */
export type CredentialSource =
	| 'profile' // fromIni - Named profile from ~/.aws/credentials or ~/.aws/config
	| 'instanceMetadata' // fromInstanceMetadata - EC2 instance profile
	| 'containerMetadata' // fromContainerMetadata - ECS task role
	| 'tokenFile' // fromTokenFile - EKS IRSA / Pod Identity
	| 'chain'; // fromNodeProviderChain - Full AWS credential chain

export interface ProfileCredentialsOptions {
	/**
	 * The credential source to use
	 * @default 'profile'
	 */
	source?: CredentialSource;

	/**
	 * Profile name when source is 'profile' or 'chain'
	 * @default 'default'
	 */
	profile?: string;

	/**
	 * AWS region for STS operations
	 */
	region?: string;

	/**
	 * Optional role ARN to assume after getting base credentials
	 * Used with 'tokenFile' source or for chained role assumption
	 */
	roleArn?: string;

	/**
	 * Session name for role assumption
	 * @default 'n8n-session'
	 */
	roleSessionName?: string;
}

export interface ResolvedCredentials {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
}

/**
 * Resolves AWS credentials using AWS SDK v3 credential providers.
 *
 * This function wraps the AWS SDK credential providers and enforces the
 * n8n security gate (N8N_AWS_SYSTEM_CREDENTIALS_ACCESS_ENABLED).
 *
 * IMPORTANT: This function NEVER mutates process.env. All configuration
 * is passed directly to the AWS SDK providers as parameters.
 *
 * Supports:
 * - Named profiles (static credentials, SSO, role assumption via source_profile)
 * - EC2 instance metadata (instance profiles)
 * - ECS container metadata (task roles)
 * - EKS Pod Identity / IRSA (token file)
 * - Full AWS credential chain
 *
 * @param options - Credential resolution options
 * @returns Promise resolving to credentials object
 * @throws ApplicationError When system credentials access is disabled or credentials cannot be resolved
 */
/**
 * Checks if AWS system credentials access is enabled.
 * This is a convenience function for checking the security gate.
 *
 * @returns true if system credentials access is enabled
 */
export function isAwsSystemCredentialsEnabled(): boolean {
	try {
		return Container.get(SecurityConfig).awsSystemCredentialsAccess;
	} catch {
		// Container not initialized or SecurityConfig not available
		return false;
	}
}

export async function resolveCredentials(
	options: ProfileCredentialsOptions = {},
): Promise<ResolvedCredentials> {
	// Check security gate - this is the ONLY place we check
	if (!isAwsSystemCredentialsEnabled()) {
		throw new UserError(
			'Access to AWS system credentials disabled. Set N8N_AWS_SYSTEM_CREDENTIALS_ACCESS_ENABLED=true to enable profile-based authentication.',
		);
	}

	const {
		source = 'profile',
		profile = 'default',
		region,
		roleArn,
		roleSessionName = 'n8n-session',
	} = options;

	try {
		let credentials: AwsCredentialIdentity;

		switch (source) {
			case 'profile':
				// Use fromIni - handles static creds, SSO, role assumption, process credentials
				credentials = await fromIni({
					profile,
					// clientConfig is used for any STS calls needed for role assumption
					clientConfig: region ? { region } : undefined,
				})();
				break;

			case 'instanceMetadata':
				// Use fromInstanceMetadata - EC2 instance profiles
				credentials = await fromInstanceMetadata({
					maxRetries: 3,
					timeout: 2000,
				})();
				break;

			case 'containerMetadata':
				// Use fromContainerMetadata - ECS task roles
				credentials = await fromContainerMetadata({
					maxRetries: 3,
					timeout: 2000,
				})();
				break;

			case 'tokenFile':
				// Use fromTokenFile - EKS IRSA / Pod Identity
				credentials = await fromTokenFile({
					roleArn,
					roleSessionName,
					clientConfig: region ? { region } : undefined,
				})();
				break;

			case 'chain':
				// Use fromNodeProviderChain - full credential chain
				credentials = await fromNodeProviderChain({
					profile,
					clientConfig: region ? { region } : undefined,
				})();
				break;

			default:
				throw new UserError(`Unknown credential source: ${source}`);
		}

		return {
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
			sessionToken: credentials.sessionToken,
		};
	} catch (error) {
		if (error instanceof UserError) {
			throw error;
		}

		const message = error instanceof Error ? error.message : 'Unknown error';
		throw createHelpfulError(message, source, profile);
	}
}

/**
 * Creates helpful error messages for common credential resolution failures.
 */
function createHelpfulError(message: string, source: CredentialSource, profile: string): UserError {
	// Profile not found
	if (message.includes('Profile') && message.includes('not found')) {
		return new UserError(
			`AWS profile '${profile}' not found. Ensure the profile exists in ~/.aws/credentials or ~/.aws/config.`,
		);
	}

	// SSO session expired
	if (message.includes('SSO') || message.includes('sso') || message.includes('token')) {
		return new UserError(
			`AWS SSO profile '${profile}' requires login. Run 'aws sso login --profile ${profile}' to authenticate.`,
		);
	}

	// Instance metadata not available
	if (
		source === 'instanceMetadata' &&
		(message.includes('timeout') || message.includes('ECONNREFUSED') || message.includes('169.254'))
	) {
		return new UserError(
			'EC2 instance metadata service not available. Ensure n8n is running on an EC2 instance with an IAM role attached.',
		);
	}

	// Container metadata not available
	if (
		source === 'containerMetadata' &&
		(message.includes('AWS_CONTAINER') || message.includes('169.254.170'))
	) {
		return new UserError(
			'ECS container credentials not available. Ensure n8n is running in an ECS task with a task role configured.',
		);
	}

	// Token file not found
	if (
		source === 'tokenFile' &&
		(message.includes('AWS_WEB_IDENTITY_TOKEN_FILE') || message.includes('ENOENT'))
	) {
		return new UserError(
			'EKS web identity token file not found. Ensure n8n is running in an EKS pod with IRSA or Pod Identity configured.',
		);
	}

	// Generic error
	return new UserError(`Failed to resolve AWS credentials (${source}): ${message}`);
}

/**
 * Creates an AWS SDK credential provider function for use with AWS SDK clients.
 *
 * This is useful when you need to pass credentials to an AWS SDK client
 * that expects a credential provider function rather than resolved credentials.
 *
 * @param options - Credential resolution options
 * @returns AWS SDK credential provider function
 */
export function createCredentialProvider(
	options: ProfileCredentialsOptions = {},
): () => Promise<AwsCredentialIdentity> {
	// Check security gate upfront
	if (!isAwsSystemCredentialsEnabled()) {
		return async () => {
			throw new UserError(
				'Access to AWS system credentials disabled. Set N8N_AWS_SYSTEM_CREDENTIALS_ACCESS_ENABLED=true to enable profile-based authentication.',
			);
		};
	}

	const {
		source = 'profile',
		profile = 'default',
		region,
		roleArn,
		roleSessionName = 'n8n-session',
	} = options;

	switch (source) {
		case 'profile':
			return fromIni({
				profile,
				clientConfig: region ? { region } : undefined,
			});

		case 'instanceMetadata':
			return fromInstanceMetadata({
				maxRetries: 3,
				timeout: 2000,
			});

		case 'containerMetadata':
			return fromContainerMetadata({
				maxRetries: 3,
				timeout: 2000,
			});

		case 'tokenFile':
			return fromTokenFile({
				roleArn,
				roleSessionName,
				clientConfig: region ? { region } : undefined,
			});

		case 'chain':
			return fromNodeProviderChain({
				profile,
				clientConfig: region ? { region } : undefined,
			});

		default:
			return async () => {
				throw new UserError(`Unknown credential source: ${source}`);
			};
	}
}
