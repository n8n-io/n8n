import { createHttpsProxyAgent, resolveProxyUrl } from '@n8n/backend-network/proxy';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@smithy/types';
import {
	type IHttpRequestMethods,
	isObjectEmpty,
	type ICredentialTestRequest,
	type IDataObject,
	type IHttpRequestOptions,
	type IRequestOptions,
	UserError,
} from 'n8n-workflow';

import { getAwsDomain, regions, type AWSRegion } from './regions';
import { getSystemCredentials } from './system-credentials-utils';
import type {
	AwsCredentialsTypeBase,
	AwsAssumeRoleCredentialsType,
	AwsSecurityHeaders,
} from './types';
import type { Request } from 'aws4';
import { sign } from 'aws4';

// ── Private ──────────────────────────────────────────────────────────────────

const SUPPORTED_AWS_REGIONS: ReadonlySet<string> = new Set(regions.map((r) => r.name));

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
 * Maps an AWS endpoint subdomain to its SigV4 signing service name.
 *
 * Most AWS endpoints sign with the same name as their hostname label, but
 * some service families (notably Amazon Bedrock) expose multiple endpoint
 * subdomains that all sign against a single `signingName`. Without this
 * mapping, `aws4` would derive the signing name from the host and AWS would
 * reject the request with `SignatureDoesNotMatch`.
 *
 * Endpoints that already match their signing name fall through unchanged.
 *
 * @param service - Service name as extracted from the endpoint hostname
 * @returns The SigV4 signing service name
 */
function getAwsSigningService(service: string): string {
	switch (service) {
		// Mirror AWS SDK Bedrock signing for HTTP Request node AWS credentials:
		// these endpoint families are signed with the `bedrock` service namespace.
		// https://docs.aws.amazon.com/bedrock/latest/APIReference/welcome.html#API_Reference_Endpoints
		// https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonbedrock.html
		case 'bedrock-runtime':
		case 'bedrock-agent':
		case 'bedrock-agent-runtime':
		case 'bedrock-data-automation':
		case 'bedrock-data-automation-runtime':
			return 'bedrock';
		default:
			return service;
	}
}

/**
 * Validates required role fields and returns their trimmed values.
 * `externalId` and `roleSessionName` are optional in the type and the STS API;
 * absent values are returned as `undefined` / the STS default rather than rejected.
 */
function assertValidRoleCredentials(credentials: AwsAssumeRoleCredentialsType): {
	roleArn: string;
	externalId: string | undefined;
	roleSessionName: string;
} {
	if (!credentials.roleArn || credentials.roleArn.trim() === '') {
		throw new UserError('Role ARN is required when assuming a role.');
	}
	return {
		roleArn: credentials.roleArn.trim(),
		externalId: credentials.externalId?.trim() || undefined,
		roleSessionName: credentials.roleSessionName?.trim() || 'n8n-session',
	};
}

/**
 * Returns an `AwsCredentialIdentityProvider` for the STS AssumeRole call.
 * Uses system credentials (env / IMDS / container) when `useSystemCredentialsForRole` is set,
 * otherwise validates and wraps the explicitly provided STS key pair.
 */
function buildMasterCredentials(
	credentials: AwsAssumeRoleCredentialsType,
	region: AWSRegion,
): AwsCredentialIdentityProvider {
	if (credentials.useSystemCredentialsForRole) {
		return async () => {
			const sys = await getSystemCredentials(region);
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
	}

	if (!credentials.stsAccessKeyId || credentials.stsAccessKeyId.trim() === '') {
		throw new UserError('STS Access Key ID is required when not using system credentials.');
	}
	if (!credentials.stsSecretAccessKey || credentials.stsSecretAccessKey.trim() === '') {
		throw new UserError('STS Secret Access Key is required when not using system credentials.');
	}
	const identity: AwsCredentialIdentity = {
		accessKeyId: credentials.stsAccessKeyId.trim(),
		secretAccessKey: credentials.stsSecretAccessKey.trim(),
		...(credentials.stsSessionToken?.trim()
			? { sessionToken: credentials.stsSessionToken.trim() }
			: {}),
	};
	// eslint-disable-next-line @typescript-eslint/promise-function-async
	return () => Promise.resolve(identity);
}

/**
 * Returns a proxy-aware `NodeHttpHandler` for the STS client, or `undefined` when no proxy applies.
 */
function buildStsRequestHandler(region: AWSRegion): NodeHttpHandler | undefined {
	const stsTarget = `https://sts.${region}.${getAwsDomain(region)}`;
	const proxyUrl = resolveProxyUrl(stsTarget);
	if (!proxyUrl) return undefined;
	// STS is always HTTPS; one agent backs both http/https slots.
	const proxyAgent = createHttpsProxyAgent(stsTarget, proxyUrl);
	return new NodeHttpHandler({ httpAgent: proxyAgent, httpsAgent: proxyAgent });
}

// ── Exports ───────────────────────────────────────────────────────────────────

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
 * Ensures the region value belongs to the supported AWS regions list before it
 * is interpolated into request URLs or signing options. Anything outside the
 * known set is rejected with a controlled error.
 */
export function assertSupportedAwsRegion(region: unknown): asserts region is AWSRegion {
	if (typeof region !== 'string' || !SUPPORTED_AWS_REGIONS.has(region)) {
		throw new UserError('Unsupported AWS region');
	}
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
	assertSupportedAwsRegion(region);
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

	const signingService = getAwsSigningService(service);
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
		...(signingService !== service && { service: signingService }),
	} as unknown as Request;

	return { signOpts, url: endpoint.origin + path };
}

/**
 * Assumes an AWS IAM role via STS and returns temporary credentials.
 * Supports two master-credential modes: system credentials (env / IMDS / container)
 * or an explicitly provided STS key pair.
 *
 * @throws {UserError} When inputs fail validation or the STS AssumeRole call is rejected.
 * @see {@link https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html}
 */
export async function assumeRole(
	credentials: AwsAssumeRoleCredentialsType,
	region: AWSRegion,
): Promise<{
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken: string;
}> {
	assertSupportedAwsRegion(region);
	const { roleArn, externalId, roleSessionName } = assertValidRoleCredentials(credentials);

	const masterCredentials = buildMasterCredentials(credentials, region);
	const requestHandler = buildStsRequestHandler(region);

	// Lazy-load the AWS SDK so the ~1.5 MB umbrella (Cognito/SSO clients) isn't
	// pulled in at startup for workflows that never assume an AWS role.
	const { fromTemporaryCredentials } = await import('@aws-sdk/credential-providers');
	const provider = fromTemporaryCredentials({
		// eslint-disable-next-line @typescript-eslint/naming-convention
		params: {
			RoleArn: roleArn,
			RoleSessionName: roleSessionName,
			...(externalId ? { ExternalId: externalId } : {}),
		},
		masterCredentials,
		clientConfig: {
			region,
			maxAttempts: 1,
			requestHandler: requestHandler ?? { requestTimeout: 2000, connectionTimeout: 2000 },
		},
	});

	try {
		const resolved = await provider();
		return {
			accessKeyId: resolved.accessKeyId,
			secretAccessKey: resolved.secretAccessKey,
			sessionToken: resolved.sessionToken ?? '',
		};
	} catch (err) {
		if (err instanceof UserError) throw err;
		const message = err instanceof Error ? err.message : String(err);
		throw new UserError(`STS AssumeRole failed: ${message}`);
	}
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
