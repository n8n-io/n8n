import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import type { Resolvers } from './system-credentials-utils';

/**
 * SDK-backed implementations of the AWS system-credential sources. Each source is
 * resolved by the *specific* AWS SDK provider that mirrors today's hand-rolled
 * resolver. We deliberately compose them with our own ordered chain in
 * `getSystemCredentials()` (see `system-credentials-utils.ts`) and never use the
 * SDK's `fromNodeProviderChain`/`defaultProvider` "find credentials anywhere"
 * helpers, which would bypass the `awsSystemCredentialsAccess` gate and the
 * source allow-list.
 *
 * Each resolver destructures only the single provider it uses at its own
 * `await import`: the SDK is lazy-loaded (kept out of startup for non-AWS
 * workflows), and the `no-aws-credential-discovery-imports` lint rule (ENT-62)
 * only allows a fully-named selection, none of which are the banned
 * aggregate-discovery helpers.
 */

type SystemCredentials = {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
};

/** The subset of an AWS SDK credential identity we consume. */
type SdkIdentity = {
	accessKeyId?: string;
	secretAccessKey?: string;
	sessionToken?: string;
};

/**
 * Matches the legacy metadata resolvers: a 2s timeout (the SDK default is 1s) and
 * no retries (the legacy code made a single request per source).
 */
const REMOTE_PROVIDER_CONFIG = { timeout: 2000, maxRetries: 0 };

// Local reader rather than reusing `envGetter` from `system-credentials-utils`:
// that module imports this one at runtime, so importing a value back would create
// a CommonJS circular dependency. Reading `process.env` directly is equivalent.
const getEnv = (key: string): string | undefined => process.env[key];

/**
 * Whether a given source should resolve through the AWS SDK. Reads the
 * transitional `awsSystemCredentialsSdkSources` flag: `all`/empty → SDK for every
 * source, `none` → legacy for every source, otherwise a comma-separated allow-list.
 */
export function usesSdk(resolver: Resolvers): boolean {
	const raw = (Container.get(SecurityConfig).awsSystemCredentialsSdkSources ?? '').trim();
	if (raw === '' || raw === 'all') return true;
	if (raw === 'none') return false;
	return raw
		.split(',')
		.map((source) => source.trim())
		.includes(resolver);
}

/**
 * Runs an SDK credential provider and maps it to the shape n8n expects. Returns
 * `null` (never throws) when the source is unavailable or resolution fails,
 * matching the legacy resolvers' "ignore and continue" behaviour.
 */
async function runProvider(
	provider: () => Promise<SdkIdentity>,
): Promise<SystemCredentials | null> {
	try {
		const identity = await provider();
		if (!identity?.accessKeyId || !identity?.secretAccessKey) return null;
		return {
			accessKeyId: identity.accessKeyId,
			secretAccessKey: identity.secretAccessKey,
			sessionToken: identity.sessionToken,
		};
	} catch {
		return null;
	}
}

/** Environment variables (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN). */
export async function resolveEnvironmentViaSdk(): Promise<SystemCredentials | null> {
	const accessKeyId = getEnv('AWS_ACCESS_KEY_ID')?.trim();
	const secretAccessKey = getEnv('AWS_SECRET_ACCESS_KEY')?.trim();
	if (!accessKeyId || !secretAccessKey) return null;
	// Read and trim directly — fromEnv() returns process.env values verbatim (no trim),
	// which breaks SigV4 signing when keys are injected with trailing newlines.
	return { accessKeyId, secretAccessKey, sessionToken: getEnv('AWS_SESSION_TOKEN')?.trim() };
}

/** EKS IRSA web-identity (AWS_ROLE_ARN + AWS_WEB_IDENTITY_TOKEN_FILE → STS). */
export async function resolveWebIdentityViaSdk(region?: string): Promise<SystemCredentials | null> {
	const roleArn = getEnv('AWS_ROLE_ARN');
	const tokenFile = getEnv('AWS_WEB_IDENTITY_TOKEN_FILE');
	if (!roleArn || !tokenFile) return null;

	// Read and trim the token ourselves: fromTokenFile reads the file verbatim
	// (no trim), so a trailing newline in a projected token would be rejected by STS.
	let webIdentityToken: string;
	try {
		const { readFile } = await import('node:fs/promises');
		webIdentityToken = (await readFile(tokenFile, 'utf-8')).trim();
	} catch {
		return null;
	}
	if (!webIdentityToken) return null;

	// fromWebToken (not fromTokenFile) so we can pass the pre-trimmed token and pin
	// the legacy RoleSessionName, which CloudTrail and IAM sts:RoleSessionName
	// conditions may depend on. It threads clientConfig into the STS client exactly
	// as fromTokenFile does, preserving the regional (incl. China/GovCloud) endpoint.
	const { fromWebToken } = await import('@aws-sdk/credential-providers');
	// Pin to single-attempt + 2 s timeout to match the other remote resolvers.
	// Pass the handler config as a plain object so NodeHttpHandler.create() builds
	// the handler internally — avoids importing @smithy/node-http-handler directly
	// (it's not a declared dependency of nodes-base).
	return await runProvider(
		fromWebToken({
			webIdentityToken,
			roleArn,
			roleSessionName: 'n8n-web-identity-session',
			clientConfig: {
				...(region ? { region } : {}),
				maxAttempts: 1,
				requestHandler: { requestTimeout: 2000, connectionTimeout: 2000 },
			},
		}),
	);
}

/** EKS Pod Identity (AWS_CONTAINER_CREDENTIALS_FULL_URI + token). */
export async function resolvePodIdentityViaSdk(): Promise<SystemCredentials | null> {
	const fullUri = getEnv('AWS_CONTAINER_CREDENTIALS_FULL_URI');
	if (!fullUri) return null;
	const { fromHttp } = await import('@aws-sdk/credential-providers');

	// Resolve the auth token before calling fromHttp for two reasons:
	// 1. The SDK reads the token file verbatim (no trim); a trailing \n in the
	//    Authorization header causes the Pod Identity agent to reject the request.
	// 2. Passing both awsContainerAuthorizationToken and awsContainerAuthorizationTokenFile
	//    lets the SDK's "direct token wins" logic override file-based tokens — the
	//    opposite of legacy behaviour. Resolving here keeps file-first precedence.
	const tokenFile = getEnv('AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE');
	let awsContainerAuthorizationToken: string | undefined;
	if (tokenFile) {
		try {
			const { readFile } = await import('node:fs/promises');
			awsContainerAuthorizationToken = (await readFile(tokenFile, 'utf-8')).trim() || undefined;
		} catch {
			// Fall back to the direct token when the file is unreadable (matches legacy).
		}
	}
	// Also covers an empty/whitespace-only token file: fall back to the direct token.
	if (!awsContainerAuthorizationToken) {
		awsContainerAuthorizationToken = getEnv('AWS_CONTAINER_AUTHORIZATION_TOKEN');
	}

	// `fromHttp` (not `fromContainerMetadata`) so we can pass the full URI and
	// token explicitly, keeping this source scoped to FULL_URI only.
	return await runProvider(
		fromHttp({
			awsContainerCredentialsFullUri: fullUri,
			awsContainerAuthorizationToken,
			// Match the legacy single-attempt behaviour (no retry) and the legacy
			// 2 s request timeout. `fromHttp`'s `timeout` is used as both the
			// HTTP request/connection timeout and the delay between retry
			// attempts, so set it alongside `maxRetries: 0` for full parity.
			timeout: 2000,
			maxRetries: 0,
		}),
	);
}

/** ECS / Fargate task role (AWS_CONTAINER_CREDENTIALS_RELATIVE_URI). */
export async function resolveContainerMetadataViaSdk(): Promise<SystemCredentials | null> {
	if (!getEnv('AWS_CONTAINER_CREDENTIALS_RELATIVE_URI')) return null;
	const { fromContainerMetadata } = await import('@aws-sdk/credential-providers');
	// This SDK provider can read two env vars: the ECS one
	// (AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) and the Pod Identity one
	// (AWS_CONTAINER_CREDENTIALS_FULL_URI). We only want ECS here. That is safe
	// because podIdentity runs first in getSystemCredentials and already handles
	// FULL_URI, so anything reaching this point is genuinely ECS.
	//
	// Wire format note: the legacy resolver sent `Authorization: Bearer ${token}`.
	// The ECS metadata agent at 169.254.170.2 does not validate the scheme prefix,
	// so that worked, but `Bearer` was never correct here — this is not an OAuth
	// bearer-token endpoint. The SDK sends the token raw (no prefix), which matches
	// the AWS-canonical form. Intentional deviation from the legacy wire format.
	return await runProvider(fromContainerMetadata(REMOTE_PROVIDER_CONFIG));
}

/** EC2 instance metadata service (IMDS). */
export async function resolveInstanceMetadataViaSdk(): Promise<SystemCredentials | null> {
	const { fromInstanceMetadata } = await import('@aws-sdk/credential-providers');
	return await runProvider(fromInstanceMetadata(REMOTE_PROVIDER_CONFIG));
}
