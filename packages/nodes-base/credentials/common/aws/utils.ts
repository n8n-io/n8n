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
	AWS_SERVICE_NAME_MAPPING,
	type AwsCredentialsTypeBase,
	regions,
	type AWSRegion,
	type AwsAssumeRoleCredentialsType,
	type AwsSecurityHeaders,
} from './types';
import { sign } from 'aws4';

import { getSystemCredentials } from './system-credentials-utils';

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
 * Normalizes AWS service names from endpoint hostnames to their correct SigV4 signing names.
 * Some AWS services use different names in their endpoint hostnames than what's required
 * for Signature Version 4 credential scoping.
 *
 * @param hostnameService - The service name extracted from the endpoint hostname
 * @returns The correct service name to use for SigV4 signing
 *
 * @example
 * normalizeServiceName('bedrock-runtime') // returns 'bedrock'
 * normalizeServiceName('s3') // returns 's3' (unchanged)
 * normalizeServiceName('iot-data') // returns 'iotdevicegateway'
 *
 * @see {@link https://docs.aws.amazon.com/general/latest/gr/signing_aws_api_requests.html AWS Signature Version 4}
 */
export function normalizeServiceName(hostnameService: string): string {
	// Check explicit mapping first for known service name mismatches
	if (AWS_SERVICE_NAME_MAPPING[hostnameService]) {
		return AWS_SERVICE_NAME_MAPPING[hostnameService];
	}

	// Fallback to pattern matching for future-proofing
	// All bedrock-*-runtime services sign as 'bedrock'
	if (hostnameService.startsWith('bedrock-') && hostnameService.includes('runtime')) {
		return 'bedrock';
	}

	// Return original service name if no mapping exists
	return hostnameService;
}

/**
 * Parses an AWS service URL to extract the service name and region.
 * Some AWS services are global and don't have a region.
 * The extracted service name is normalized to the correct SigV4 signing service name.
 *
 * @param url - The AWS service URL to parse
 * @returns Object containing the normalized service name and region (null for global services)
 *
 * @see {@link https://docs.aws.amazon.com/general/latest/gr/rande.html#global-endpoints AWS Global Endpoints}
 */
export function parseAwsUrl(url: URL): { region: AWSRegion | null; service: string } {
	const hostname = url.hostname;
	// Handle both .amazonaws.com and .amazonaws.com.cn domains
	const [hostnameService, region] = hostname.replace(/\.amazonaws\.com.*$/, '').split('.');
	// Normalize the service name to handle hostname/SigV4 naming mismatches
	const service = normalizeServiceName(hostnameService);
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
		// Only override service if not explicitly provided
		if (!service || service === '') {
			service = parsed.service;
		}
		// Only override region if not explicitly provided and URL has a valid region
		if (parsed.region && (!region || region === '')) {
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
			// Only override service if not explicitly provided
			if (!service || service === '') {
				service = parsed.service;
			}
			// Only override region if not explicitly provided and URL has a valid region
			if (parsed.region && (!region || region === '')) {
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

	// Normalize service name after all service resolution logic
	// This ensures both URL-parsed and explicitly-provided service names are normalized
	service = normalizeServiceName(service);

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
		service,
	} as unknown as Request;

	return { signOpts, url: endpoint.origin + path };
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
		if (systemCredentials.source !== 'environment') {
			return {
				accessKeyId: systemCredentials.accessKeyId,
				secretAccessKey: systemCredentials.secretAccessKey,
				sessionToken: systemCredentials.sessionToken as string,
			};
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
