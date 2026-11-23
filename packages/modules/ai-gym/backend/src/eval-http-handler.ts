import type { CredentialResult, GymManifest, Tenant } from '@n8n/ai-gym';
import type { Logger } from '@n8n/backend-common';
import { isRecord } from '@n8n/utils/is-record';
import type { EvalLlmMockHandler, EvalMockHttpResponse } from 'n8n-core';

import { matchManifestHost } from './node-support-validator';

/**
 * Vendor slugs excluded from automatic eval HTTP interception:
 * - LLM providers: the agent's model calls and sub-node LLM calls run through the eval model path.
 * - Non-HTTP protocols: FTP/SMTP/IMAP do not flow through HTTP request handlers.
 * - Vendors whose unseeded `mintCredential` currently panics in the native addon (`quickbooks`, `snowflake`).
 */
const DEFAULT_EXCLUDED_EVAL_VENDORS = new Set<string>([
	'openai',
	'anthropic',
	'gemini',
	'cohere',
	'mistral',
	'ollama',
	'bedrock',
	'azure-openai',
	'llm-compat',
	'ftp',
	'email-smtp-imap',
	'quickbooks',
	'snowflake',
]);

/** Vendors that require an initial empty seed before `mintCredential` succeeds. */
const SEED_BEFORE_MINT_VENDORS = new Set<string>(['gmail']);

/** Vendors that expect a raw API key (without `Bearer `) in the Authorization header. */
const RAW_AUTH_VENDORS = new Set<string>(['linear']);

export interface AiGymEvalHttpHandlerOptions {
	tenant: Tenant;
	manifest: GymManifest;
	/** Optional explicit allowlist of vendor slugs. Defaults to all supported non-LLM manifest vendors. */
	services?: string[];
	/** Additional vendor slugs to exclude from interception. */
	excludeVendors?: Iterable<string>;
	/** Optional logger for diagnostic debug messages when falling through. */
	logger?: Logger;
}

function extractRequestUrl(requestOptions: Parameters<EvalLlmMockHandler>[0]): string | undefined {
	if (typeof requestOptions.url === 'string' && requestOptions.url.length > 0) {
		return requestOptions.url;
	}
	if (
		'uri' in requestOptions &&
		typeof requestOptions.uri === 'string' &&
		requestOptions.uri.length > 0
	) {
		return requestOptions.uri;
	}
	return undefined;
}

function extractAuthorizationHeader(vendor: string, minted: CredentialResult): string | undefined {
	const record = isRecord(minted) ? minted : undefined;
	if (!record) return undefined;

	if (RAW_AUTH_VENDORS.has(vendor)) {
		if (typeof record.apiKey === 'string' && record.apiKey.length > 0) {
			return record.apiKey;
		}
		if (typeof record.access_token === 'string' && record.access_token.length > 0) {
			return `Bearer ${record.access_token}`;
		}
	}

	const bearerCandidate =
		(typeof record.token === 'string' && record.token) ||
		(typeof record.access_token === 'string' && record.access_token) ||
		(typeof record.accessToken === 'string' && record.accessToken) ||
		(typeof record.secretKey === 'string' && record.secretKey) ||
		(typeof record.apiKey === 'string' && record.apiKey) ||
		(typeof record.api_key === 'string' && record.api_key) ||
		undefined;

	return bearerCandidate ? `Bearer ${bearerCandidate}` : undefined;
}

async function mintAndExchangeAuthorization(
	tenant: Tenant,
	vendor: string,
): Promise<string | undefined> {
	if (SEED_BEFORE_MINT_VENDORS.has(vendor)) {
		await tenant.seed(vendor, {}).catch(() => undefined);
	}

	let minted: CredentialResult;
	try {
		minted = await tenant.mintCredential(vendor);
	} catch (error) {
		// Retry once after an empty seed for vendors that initialize default state on seed.
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes('seed') || message.includes('404')) {
			await tenant.seed(vendor, {}).catch(() => undefined);
			minted = await tenant.mintCredential(vendor);
		} else {
			throw error;
		}
	}

	const direct = extractAuthorizationHeader(vendor, minted);
	if (direct) return direct;

	const record = isRecord(minted) ? minted : undefined;
	const refreshToken =
		record && typeof record.refresh_token === 'string' ? record.refresh_token : undefined;
	const tokenUri = record && typeof record.token_uri === 'string' ? record.token_uri : undefined;
	if (!refreshToken || !tokenUri) return undefined;

	const clientId = record && typeof record.client_id === 'string' ? record.client_id : undefined;
	const clientSecret =
		record && typeof record.client_secret === 'string' ? record.client_secret : undefined;

	const form = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: refreshToken,
		...(clientId ? { client_id: clientId } : {}),
		...(clientSecret ? { client_secret: clientSecret } : {}),
	});

	const exchanged = await tenant.run({ services: [vendor], unmatched: 'block' }, async (scope) => {
		const res = await scope.fetch(tokenUri, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: form.toString(),
		});
		if (!res.ok) return undefined;
		return (await res.json()) as unknown;
	});

	if (isRecord(exchanged) && typeof exchanged.access_token === 'string' && exchanged.access_token) {
		return `Bearer ${exchanged.access_token}`;
	}
	return undefined;
}

/**
 * Builds an `EvalLlmMockHandler` backed by an in-process ai-gym `Tenant`.
 *
 * Requests whose host matches an enabled ai-gym vendor are dispatched in-process through
 * `tenant.requestHandler(...)` with a lazily minted (and OAuth2-exchanged when needed)
 * tenant authorization header. Requests to unmatched hosts, or routes the gym reports as
 * `501 Not Implemented`, return `undefined` so the caller can fall back to the LLM mock.
 */
export function createAiGymEvalHttpHandler(
	options: AiGymEvalHttpHandlerOptions,
): EvalLlmMockHandler {
	const excluded = new Set(DEFAULT_EXCLUDED_EVAL_VENDORS);
	if (options.excludeVendors) {
		for (const slug of options.excludeVendors) {
			excluded.add(slug);
		}
	}

	const allowlist = options.services ? new Set(options.services) : undefined;
	const vendors = options.manifest.vendors.filter((vendor) => {
		if (excluded.has(vendor.slug)) return false;
		if (allowlist && !allowlist.has(vendor.slug)) return false;
		return vendor.hosts.length > 0;
	});

	const authByVendor = new Map<string, Promise<string | undefined>>();
	const handlerByVendor = new Map<string, ReturnType<Tenant['requestHandler']>>();

	const matchVendor = (host: string): string | undefined => {
		for (const vendor of vendors) {
			if (vendor.hosts.some((pattern) => matchManifestHost(pattern, host))) {
				return vendor.slug;
			}
		}
		return undefined;
	};

	const getVendorAuth = async (vendor: string): Promise<string | undefined> => {
		let pending = authByVendor.get(vendor);
		if (!pending) {
			pending = mintAndExchangeAuthorization(options.tenant, vendor).catch((error: unknown) => {
				options.logger?.debug('[ai-gym] Failed to mint eval credential for vendor', {
					scopes: ['ai-gym'],
					vendor,
					error: error instanceof Error ? error.message : String(error),
				});
				return undefined;
			});
			authByVendor.set(vendor, pending);
		}
		return await pending;
	};

	const getVendorHandler = async (vendor: string) => {
		let handler = handlerByVendor.get(vendor);
		if (!handler) {
			const authorization = await getVendorAuth(vendor);
			handler = options.tenant.requestHandler({
				services: [vendor],
				...(authorization ? { authorization } : {}),
			});
			handlerByVendor.set(vendor, handler);
		}
		return handler;
	};

	return async (requestOptions): Promise<EvalMockHttpResponse | undefined> => {
		const rawUrl = extractRequestUrl(requestOptions);
		if (!rawUrl) return undefined;

		let parsed: URL;
		try {
			parsed = new URL(rawUrl);
		} catch {
			return undefined;
		}

		const vendor = matchVendor(parsed.host);
		if (!vendor) return undefined;

		try {
			const vendorHandler = await getVendorHandler(vendor);
			const response = await vendorHandler(requestOptions);
			if (!response) return undefined;

			// Fall back to the caller's handler when the gym explicitly reports an unimplemented route.
			if (response.statusCode === 501) {
				options.logger?.debug('[ai-gym] Vendor route not implemented in gym; falling back', {
					scopes: ['ai-gym'],
					vendor,
					url: rawUrl,
				});
				return undefined;
			}

			return response;
		} catch (error) {
			options.logger?.debug('[ai-gym] In-process eval dispatch failed; falling back', {
				scopes: ['ai-gym'],
				vendor,
				url: rawUrl,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	};
}

/**
 * Composes an ai-gym handler in front of a fallback `EvalLlmMockHandler`.
 * Supported vendor calls run in-process against the stateful gym tenant; everything else
 * falls through to the fallback handler.
 */
export function composeEvalHttpHandlers(
	primary: EvalLlmMockHandler,
	fallback: EvalLlmMockHandler,
): EvalLlmMockHandler {
	return async (requestOptions, node) => {
		const simulated = await primary(requestOptions, node);
		if (simulated !== undefined) {
			return simulated;
		}
		return await fallback(requestOptions, node);
	};
}
