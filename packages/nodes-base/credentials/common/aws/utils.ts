import { Sha256 } from '@aws-crypto/sha256-js';
import { createHttpsProxyAgent, resolveProxyUrl } from '@n8n/backend-network/proxy';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@smithy/types';
import type { Request } from 'aws4';
import { sign } from 'aws4';
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
	// Virtual-hosted-style S3 requests arrive as `<bucket>.s3` (the node builds the
	// endpoint `<bucket>.s3.<region>.amazonaws.com`). They all sign under the `s3`
	// signing name. aws4 derived this by inspecting the host; smithy does not, so we
	// normalize it here.
	if (service === 's3' || service.endsWith('.s3')) {
		return 's3';
	}
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
		} else {
			// UI Query Parameters are stored at the top level of requestOptions.qs, not under
			// a nested `query` key, so merge the whole object to sign and send them.
			query = requestWithUri.qs as IDataObject;
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
		// Always carry the resolved signing service. The signer must not re-derive it
		// from the hostname: virtual-hosted S3 (bucket.s3.<region>.amazonaws.com) would
		// yield the bucket name instead of 's3', breaking the signature and the
		// S3-specific signing rules.
		service: signingService,
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

// Splits a path+search string into the pathname and a query parameter map.
// smithy's SignatureV4 requires query params as a separate object, not embedded in the path.
// The path is sliced raw (not run through URL) to preserve exact bytes, which S3 signing
// depends on. Query parsing uses URLSearchParams; repeated keys are kept as arrays since
// smithy accepts string | string[].
export function splitPathAndQuery(pathWithSearch: string): {
	path: string;
	query: Record<string, string | string[]>;
} {
	const idx = pathWithSearch.indexOf('?');
	if (idx === -1) return { path: pathWithSearch, query: {} };

	const query: Record<string, string | string[]> = {};
	for (const [key, value] of new URLSearchParams(pathWithSearch.slice(idx + 1))) {
		const existing = query[key];
		if (existing === undefined) query[key] = value;
		else query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
	}

	return { path: pathWithSearch.slice(0, idx), query };
}

// Splits a `host[:port]` string into hostname and numeric port, bracket-aware for
// IPv6 literals (e.g. `[::1]:4566`). A naive `.split(':')` would cut an IPv6
// address at its first colon.
export function splitHostPort(host: string): { hostname: string; port: number | undefined } {
	if (host.startsWith('[')) {
		const closeIdx = host.indexOf(']');
		if (closeIdx !== -1) {
			const hostname = host.slice(0, closeIdx + 1);
			const rest = host.slice(closeIdx + 1);
			const port = rest.startsWith(':') ? parseInt(rest.slice(1), 10) : undefined;
			return { hostname, port };
		}
	}
	const [hostname, portStr] = host.split(':');
	return { hostname, port: portStr ? parseInt(portStr, 10) : undefined };
}

// Legacy aws4 signer, kept behind N8N_AWS_LEGACY_SIGNER as an operator rollback
// lever. Temporary: removed together with aws4 once the smithy path has soaked.
function signWithLegacyAws4(
	requestOptions: IHttpRequestOptions,
	signOpts: Request,
	securityHeaders: AwsSecurityHeaders,
	url: string,
	method?: IHttpRequestMethods,
): IHttpRequestOptions {
	// Let signing errors propagate. Continuing with an unsigned request only yields
	// an opaque 403 from AWS that hides the real cause.
	sign(signOpts, securityHeaders);
	return {
		...requestOptions,
		headers: signOpts.headers,
		method,
		url,
		body: signOpts.body,
		qs: undefined,
	};
}

// Translates n8n's aws4-shaped Request into a smithy HttpRequest: splits the query
// out of the path, lowercases header keys (so smithy's canonical sort is stable),
// and mirrors aws4's content-type/length injection for body requests.
export function buildSmithyHttpRequest(
	signOpts: Request,
	method?: IHttpRequestMethods,
): HttpRequest {
	const { path, query } = splitPathAndQuery(signOpts.path ?? '/');
	const { hostname, port } = splitHostPort(signOpts.host ?? '');

	// Drop host; smithy derives it from hostname.
	const headers: Record<string, string> = { host: signOpts.host ?? hostname };
	for (const [k, v] of Object.entries((signOpts.headers ?? {}) as Record<string, string>)) {
		const lower = k.toLowerCase();
		if (lower !== 'host') headers[lower] = v;
	}

	// aws4 defaults the Content-Type to 'application/x-www-form-urlencoded; charset=utf-8'
	// (not json) and sets Content-Length for any truthy body, string or Buffer;
	// smithy injects neither.
	const body = signOpts.body;
	const hasBody = (typeof body === 'string' && body.length > 0) || Buffer.isBuffer(body);
	if (hasBody) {
		if (!headers['content-type']) {
			headers['content-type'] = 'application/x-www-form-urlencoded; charset=utf-8';
		}
		if (!headers['content-length']) {
			headers['content-length'] = String(Buffer.byteLength(body as string | Buffer));
		}
	}

	return new HttpRequest({
		method: (signOpts.method ?? method ?? 'GET').toUpperCase(),
		hostname,
		...(port !== undefined && { port }),
		path: path || '/',
		...(Object.keys(query).length > 0 && { query }),
		headers,
		body: signOpts.body ?? undefined,
		protocol: 'https:',
	});
}

export async function signOptions(
	requestOptions: IHttpRequestOptions,
	signOpts: Request,
	securityHeaders: AwsSecurityHeaders,
	url: string,
	method?: IHttpRequestMethods,
): Promise<IHttpRequestOptions> {
	if (process.env.N8N_AWS_LEGACY_SIGNER === 'true') {
		return signWithLegacyAws4(requestOptions, signOpts, securityHeaders, url, method);
	}

	const httpRequest = buildSmithyHttpRequest(signOpts, method);

	// signOpts.service is set only when the signing name differs from the endpoint name
	// (e.g. bedrock-runtime → bedrock). Fall back to the first label of the hostname.
	const service = signOpts.service ?? httpRequest.hostname.split('.')[0];
	const region = signOpts.region ?? 'us-east-1';

	// S3 needs aws4-equivalent treatment that other services must not get:
	// it requires the x-amz-content-sha256 header in the signature, and its
	// object keys must not be path-normalized or double-encoded. aws4 special-cased
	// S3 the same way; smithy's defaults (no checksum header, uriEscapePath: true)
	// match aws4 only for non-S3 services.
	const isS3 = service === 's3';

	const signer = new SignatureV4({
		credentials: {
			accessKeyId: securityHeaders.accessKeyId,
			secretAccessKey: securityHeaders.secretAccessKey,
			...(securityHeaders.sessionToken && { sessionToken: securityHeaders.sessionToken }),
		},
		region,
		service,
		sha256: Sha256,
		applyChecksum: isS3,
		uriEscapePath: !isS3,
	});

	// Let signing errors propagate. Falling back to the unsigned request only yields
	// an opaque 403 from AWS that hides the real cause.
	const signedRequest = (await signer.sign(httpRequest)) as HttpRequest;

	return {
		...requestOptions,
		headers: signedRequest.headers,
		method,
		url,
		body: signOpts.body,
		qs: undefined, // already encoded in url
	};
}
