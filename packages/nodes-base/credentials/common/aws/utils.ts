import {
	ApplicationError,
	type IHttpRequestMethods,
	isObjectEmpty,
	type ICredentialTestRequest,
	type IDataObject,
	type IHttpRequestOptions,
	type IRequestOptions,
} from 'n8n-workflow';
import { parseString } from 'xml2js';
import type { Request } from 'aws4';
import {
	AWS_GLOBAL_DOMAIN,
	type AwsCredentialsTypeBase,
	regions,
	type AWSRegion,
	type AwsAssumeRoleCredentialsType,
	type AwsSecurityHeaders,
} from './types';
import { sign } from 'aws4';

import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';

/**
 * Checks if a request body value should be JSON stringified for AWS requests.
 * Returns true for plain objects without Content-Length headers.
 */
function shouldStringifyBody<T>(value: T, headers: IDataObject): boolean {
	if (
		typeof value === 'object' &&
		value !== null &&
		!headers['Content-Length'] &&
		!headers['content-length'] &&
		!Buffer.isBuffer(value)
	) {
		return true;
	}

	return false;
}

/**
 * Gets the AWS domain for a specific region.
 *
 * @param region - The AWS region to get the domain for
 * @returns The AWS domain for the region, or the global domain if region not found
 */
export function getAwsDomain(region: AWSRegion): string {
	return regions.find((r) => r.name === region)?.domain ?? AWS_GLOBAL_DOMAIN;
}

/**
 * Parses an AWS service URL to extract the service name and region.
 * Some AWS services are global and don't have a region.
 *
 * @param url - The AWS service URL to parse
 * @returns Object containing the service name and region (null for global services)
 *
 * @see {@link https://docs.aws.amazon.com/general/latest/gr/rande.html#global-endpoints AWS Global Endpoints}
 */
export function parseAwsUrl(url: URL): { region: AWSRegion | null; service: string } {
	const hostname = url.hostname;
	// Handle both .amazonaws.com and .amazonaws.com.cn domains
	const [service, region] = hostname.replace(/\.amazonaws\.com.*$/, '').split('.');
	return { service, region };
}

/**
 * AWS credentials test configuration for validating AWS credentials.
 * Uses the STS GetCallerIdentity action to verify that the provided credentials are valid.
 * Automatically handles both standard AWS regions and China regions with appropriate endpoints.
 */
export const awsCredentialsTest: ICredentialTestRequest = {
	request: {
		baseURL:
			// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
			'={{$credentials.region.startsWith("cn-") ? `https://sts.${$credentials.region}.amazonaws.com.cn` : `https://sts.${$credentials.region}.amazonaws.com`}}',
		url: '?Action=GetCallerIdentity&Version=2011-06-15',
		method: 'POST',
	},
};

/**
 * Prepares AWS request options for signing by constructing the proper endpoint URL,
 * handling query parameters, and setting up the request body for AWS4 signature.
 *
 * This function handles multiple scenarios:
 * - Custom service endpoints from credentials
 * - Default AWS service endpoints
 * - URI-based requests (legacy IRequestOptions interface)
 * - Form data conversion to URL-encoded format
 * - Special handling for STS GetCallerIdentity requests
 *
 * @param requestOptions - The HTTP request options to modify
 * @param credentials - AWS credentials containing potential custom endpoints
 * @param path - The API path to append to the endpoint
 * @param method - HTTP method for the request
 * @param service - AWS service name (e.g., 's3', 'lambda', 'sts')
 * @param region - AWS region for the request
 * @returns Object containing signing options and the constructed endpoint URL
 */
export function awsGetSignInOptionsAndUpdateRequest(
	requestOptions: IHttpRequestOptions,
	credentials: AwsCredentialsTypeBase,
	path: string,
	method: string | undefined,
	service: string,
	region: AWSRegion,
): { signOpts: Request; url: string } {
	let body = requestOptions.body;
	let endpoint: URL;
	let query = requestOptions.qs?.query as IDataObject;
	// ! Workaround as we still use the IRequestOptions interface which uses uri instead of url
	// ! To change when we replace the interface with IHttpRequestOptions
	const requestWithUri = requestOptions as unknown as IRequestOptions;
	if (requestWithUri.uri) {
		requestOptions.url = requestWithUri.uri;
		endpoint = new URL(requestOptions.url);
		if (service === 'sts') {
			try {
				if (requestWithUri.qs?.Action !== 'GetCallerIdentity') {
					query = requestWithUri.qs as IDataObject;
				} else {
					endpoint.searchParams.set('Action', 'GetCallerIdentity');
					endpoint.searchParams.set('Version', '2011-06-15');
				}
			} catch (err) {
				console.error(err);
			}
		}
		const parsed = parseAwsUrl(endpoint);
		service = parsed.service;
		if (parsed.region) {
			region = parsed.region;
		}
	} else {
		if (!requestOptions.baseURL && !requestOptions.url) {
			let endpointString: string;
			if (service === 'lambda' && credentials.lambdaEndpoint) {
				endpointString = credentials.lambdaEndpoint;
			} else if (service === 'sns' && credentials.snsEndpoint) {
				endpointString = credentials.snsEndpoint;
			} else if (service === 'sqs' && credentials.sqsEndpoint) {
				endpointString = credentials.sqsEndpoint;
			} else if (service === 's3' && credentials.s3Endpoint) {
				endpointString = credentials.s3Endpoint;
			} else if (service === 'ses' && credentials.sesEndpoint) {
				endpointString = credentials.sesEndpoint;
			} else if (service === 'rekognition' && credentials.rekognitionEndpoint) {
				endpointString = credentials.rekognitionEndpoint;
			} else if (service === 'ssm' && credentials.ssmEndpoint) {
				endpointString = credentials.ssmEndpoint;
			} else if (service) {
				const domain = getAwsDomain(region);
				endpointString = `https://${service}.${region}.${domain}`;
			}
			endpoint = new URL(endpointString!.replace('{region}', region) + path);
		} else {
			// If no endpoint is set, we try to decompose the path and use the default endpoint
			const customUrl = new URL(`${requestOptions.baseURL!}${requestOptions.url}${path}`);
			const parsed = parseAwsUrl(customUrl);
			service = parsed.service;
			if (parsed.region) {
				region = parsed.region;
			}
			if (service === 'sts') {
				try {
					customUrl.searchParams.set('Action', 'GetCallerIdentity');
					customUrl.searchParams.set('Version', '2011-06-15');
				} catch (err) {
					console.error(err);
				}
			}
			endpoint = customUrl;
		}
	}

	if (query && Object.keys(query).length !== 0) {
		Object.keys(query).forEach((key) => {
			endpoint.searchParams.append(key, query[key] as string);
		});
	}

	if (body && typeof body === 'object' && isObjectEmpty(body)) {
		body = '';
	}

	path = endpoint.pathname + endpoint.search;

	// ! aws4.sign *must* have the body to sign, but we might have .form instead of .body
	const requestWithForm = requestOptions as unknown as { form?: Record<string, string> };
	let bodyContent = body !== '' ? body : undefined;
	let contentTypeHeader: string | undefined = undefined;

	if (shouldStringifyBody(bodyContent, requestOptions.headers ?? {})) {
		bodyContent = JSON.stringify(bodyContent);
	}

	if (requestWithForm.form) {
		const params = new URLSearchParams();
		for (const key in requestWithForm.form) {
			params.append(key, requestWithForm.form[key]);
		}
		bodyContent = params.toString();
		contentTypeHeader = 'application/x-www-form-urlencoded';
	}
	const signOpts = {
		...requestOptions,
		headers: {
			...(requestOptions.headers ?? {}),
			...(contentTypeHeader && { 'content-type': contentTypeHeader }),
		},
		host: endpoint.host,
		method,
		path,
		body: bodyContent,
		region,
	} as unknown as Request;

	return { signOpts, url: endpoint.origin + path };
}

/**
 * Retrieves AWS credentials from various system sources following the AWS credential chain.
 * Attempts to get credentials in the following order:
 * 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)
 * 2. AWS Profile (AWS_PROFILE) - currently logs warning as not implemented
 * 3. EKS Pod Identity (AWS_CONTAINER_CREDENTIALS_FULL_URI)
 * 4. ECS/Fargate container metadata (AWS_CONTAINER_CREDENTIALS_RELATIVE_URI)
 * 5. EC2 instance metadata service
 *
 * @returns Promise resolving to credentials object or null if no credentials found
 *
 */
async function getSystemCredentials(): Promise<{
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
} | null> {
	if (!Container.get(SecurityConfig).awsSystemCredentialsAccess) {
		throw new ApplicationError(
			'Access to AWS system credentials disabled, contact your administrator.',
		);
	}

	// 1. Check for explicit environment variables
	const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
	const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
	const sessionToken = process.env.AWS_SESSION_TOKEN;

	if (accessKeyId && secretAccessKey) {
		return {
			accessKeyId: accessKeyId.trim(),
			secretAccessKey: secretAccessKey.trim(),
			sessionToken: sessionToken?.trim(),
		};
	}

	// 2. Check for AWS_PROFILE environment variable
	// if (process.env.AWS_PROFILE) {
	// 	// Note: In a real implementation, you might want to use AWS SDK to load credentials from profile
	// 	// For now, we'll just indicate that profile-based credentials are supported
	// 	console.warn(
	// 		'AWS_PROFILE is set but profile-based credential loading is not implemented in this credential. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or use instance/container role.',
	// 	);
	// }

	// 3. Try to get credentials from EKS Pod Identity (AWS_CONTAINER_CREDENTIALS_FULL_URI)
	try {
		const podIdentityCredentials = await getPodIdentityCredentials();
		if (podIdentityCredentials) {
			return podIdentityCredentials;
		}
	} catch (error) {
		console.debug('Failed to get credentials from EKS Pod Identity:', error);
	}

	// 4. Try to get credentials from container metadata service (ECS/Fargate)
	try {
		const containerCredentials = await getContainerMetadataCredentials();
		if (containerCredentials) {
			return containerCredentials;
		}
	} catch (error) {
		console.debug('Failed to get credentials from container metadata:', error);
	}

	// 5. Try to get credentials from instance metadata service (EC2)
	try {
		const instanceCredentials = await getInstanceMetadataCredentials();
		if (instanceCredentials) {
			return instanceCredentials;
		}
	} catch (error) {
		console.debug('Failed to get credentials from instance metadata:', error);
	}

	return null;
}

/**
 * Retrieves AWS credentials from EC2 instance metadata service.
 * This function is used when running on an EC2 instance with an attached IAM role.
 * It makes HTTP requests to the instance metadata service at 169.254.169.254.
 *
 * @returns Promise resolving to credentials object or null if not running on EC2 or no role attached
 *
 * @see {@link https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html IAM Roles for Amazon EC2}
 */
async function getInstanceMetadataCredentials(): Promise<{
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken: string;
} | null> {
	try {
		const response = await fetch(
			'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
			{
				method: 'GET',
				headers: {
					'User-Agent': 'n8n-aws-credential',
				},
				signal: AbortSignal.timeout(2000),
			},
		);

		if (!response.ok) {
			return null;
		}

		const roleName = await response.text();
		if (!roleName) {
			return null;
		}

		// Get credentials for the role
		const credentialsResponse = await fetch(
			`http://169.254.169.254/latest/meta-data/iam/security-credentials/${roleName}`,
			{
				method: 'GET',
				headers: {
					'User-Agent': 'n8n-aws-credential',
				},
				signal: AbortSignal.timeout(2000),
			},
		);

		if (!credentialsResponse.ok) {
			return null;
		}

		const credentialsData = await credentialsResponse.json();

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
 *
 * @returns Promise resolving to credentials object or null if not running in ECS/Fargate or no task role
 *
 * @see {@link https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html IAM Roles for Tasks}
 */
async function getContainerMetadataCredentials(): Promise<{
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken: string;
} | null> {
	try {
		const relativeUri = process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
		if (!relativeUri) {
			return null;
		}

		const response = await fetch(`http://169.254.170.2${relativeUri}`, {
			method: 'GET',
			headers: {
				'User-Agent': 'n8n-aws-credential',
			},
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
 *
 * @returns Promise resolving to credentials object or null if not running with EKS Pod Identity
 *
 * @see {@link https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html EKS Pod Identities}
 */
async function getPodIdentityCredentials(): Promise<{
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken: string;
} | null> {
	const fullUri = process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI;
	if (!fullUri) {
		return null;
	}

	try {
		const response = await fetch(fullUri, {
			method: 'GET',
			headers: {
				'User-Agent': 'n8n-aws-credential',
			},
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
 * Assumes an AWS IAM role using STS (Security Token Service) and returns temporary credentials.
 * This function supports two modes for providing credentials for the STS call:
 * 1. Using system credentials (environment variables, instance metadata, etc.)
 * 2. Using manually provided STS credentials
 *
 * @param credentials - The assume role credentials configuration
 * @param region - AWS region for the STS endpoint
 * @returns Promise resolving to temporary credentials for the assumed role
 * @throws {ApplicationError} When credentials are invalid or STS call fails
 *
 * @see {@link https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html STS AssumeRole API}
 */
export async function assumeRole(
	credentials: AwsAssumeRoleCredentialsType,
	region: AWSRegion,
): Promise<{
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken: string;
}> {
	let stsCallCredentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };

	const useSystemCredentialsForRole = credentials.useSystemCredentialsForRole ?? false;

	if (useSystemCredentialsForRole) {
		const systemCredentials = await getSystemCredentials();
		if (!systemCredentials) {
			throw new ApplicationError(
				'System AWS credentials are required for role assumption. Please ensure AWS credentials are available via environment variables, instance metadata, or container role.',
			);
		}
		stsCallCredentials = systemCredentials;
	} else {
		if (!credentials.stsAccessKeyId || credentials.stsAccessKeyId.trim() === '') {
			throw new ApplicationError(
				'STS Access Key ID is required when not using system credentials.',
			);
		}
		if (!credentials.stsSecretAccessKey || credentials.stsSecretAccessKey.trim() === '') {
			throw new ApplicationError(
				'STS Secret Access Key is required when not using system credentials.',
			);
		}

		const sessionToken = credentials.stsSessionToken?.trim() || undefined;

		stsCallCredentials = {
			accessKeyId: credentials.stsAccessKeyId.trim(),
			secretAccessKey: credentials.stsSecretAccessKey.trim(),
			sessionToken,
		};
	}

	const domain = getAwsDomain(region);
	const stsEndpoint = `https://sts.${region}.${domain}`;

	const assumeRoleBody = {
		RoleArn: credentials.roleArn,
		RoleSessionName: credentials.roleSessionName || 'n8n-session',
		...(credentials.externalId && { ExternalId: credentials.externalId }),
	};

	const params = new URLSearchParams({
		Action: 'AssumeRole',
		Version: '2011-06-15',
		RoleArn: assumeRoleBody.RoleArn!,
		RoleSessionName: assumeRoleBody.RoleSessionName,
	});
	if (assumeRoleBody.ExternalId) {
		params.append('ExternalId', assumeRoleBody.ExternalId);
	}

	const bodyContent = params.toString();

	const stsUrl = new URL(stsEndpoint);
	const signOpts = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		host: stsUrl.host,
		method: 'POST',
		path: '/',
		body: bodyContent,
		region,
	} as Request;

	try {
		sign(signOpts, stsCallCredentials);
	} catch (err) {
		console.error('Failed to sign STS request:', err);
		throw new ApplicationError('Failed to sign STS request');
	}

	const response = await fetch(stsEndpoint, {
		method: 'POST',
		headers: signOpts.headers as Record<string, string>,
		body: bodyContent,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new ApplicationError(
			`STS AssumeRole failed: ${response.status} ${response.statusText} - ${errorText}`,
		);
	}

	const responseText = await response.text();
	const responseData = await new Promise<IDataObject>((resolve, reject) => {
		parseString(responseText, { explicitArray: false }, (err: any, data: IDataObject) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});

	const assumeRoleResult = (responseData.AssumeRoleResponse as IDataObject)
		?.AssumeRoleResult as IDataObject;
	if (!assumeRoleResult?.Credentials) {
		throw new ApplicationError('Invalid response from STS AssumeRole');
	}

	const assumedCredentials = assumeRoleResult.Credentials as IDataObject;

	const securityHeaders = {
		accessKeyId: assumedCredentials.AccessKeyId as string,
		secretAccessKey: assumedCredentials.SecretAccessKey as string,
		sessionToken: assumedCredentials.SessionToken as string,
	};

	return securityHeaders;
}

export function signOptions(
	requestOptions: IHttpRequestOptions,
	signOpts: Request,
	securityHeaders: AwsSecurityHeaders,
	url: string,
	method?: IHttpRequestMethods,
) {
	try {
		sign(signOpts, securityHeaders);
	} catch (err) {
		console.error(err);
	}
	const options: IHttpRequestOptions = {
		...requestOptions,
		headers: signOpts.headers,
		method,
		url,
		body: signOpts.body,
		qs: undefined, // override since it's already in the url
	};

	return options;
}
