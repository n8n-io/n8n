import type { GymManifest, ScopeApi } from '@n8n/ai-gym';
import type { ScopedFetchInterceptor } from '@n8n/backend-network';

import { matchManifestHost } from './node-support-validator';

/**
 * Creates a `ScopedFetchInterceptor` that matches any host owned by the selected
 * ai-gym vendors and forwards matching requests directly into the tenant's `scope.fetch`.
 *
 * Non-matching hosts are blocked (`unmatched: 'block'`) when `blockUnmatched` is true
 * so a simulation can never accidentally leak traffic to the live internet.
 */
export function createAiGymScopedInterceptor(params: {
	manifest: GymManifest;
	scope: ScopeApi;
	services?: string[];
	blockUnmatched?: boolean;
}): ScopedFetchInterceptor {
	const selectedVendors =
		params.services && params.services.length > 0
			? params.manifest.vendors.filter((vendor) => params.services?.includes(vendor.slug))
			: params.manifest.vendors;

	const hostPatterns = selectedVendors.flatMap((vendor) => vendor.hosts);
	const blockUnmatched = params.blockUnmatched ?? true;

	const isMatched = (host: string): boolean =>
		hostPatterns.some((pattern) => matchManifestHost(pattern, host));

	return {
		matches(url: URL): boolean {
			if (isMatched(url.host)) return true;
			return blockUnmatched;
		},
		async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
			const urlStr =
				typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
			const parsed = new URL(urlStr);
			if (!isMatched(parsed.host)) {
				throw new Error(
					`ai-gym simulation blocked outbound request to unsupported host: ${parsed.host}`,
				);
			}
			return await params.scope.fetch(input, init);
		},
	};
}
