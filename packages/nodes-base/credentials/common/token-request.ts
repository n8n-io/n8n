import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import type { HttpRequestClient } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';

export const TOKEN_REQUEST_TIMEOUT = 30_000;

/**
 * Builds the HTTP client used to perform a credential's token-exchange POST.
 *
 * ## Why these credentials don't go through `this.helpers.httpRequest`
 *
 * A few credential types (Google service account, Salesforce JWT, Cisco Secure
 * Endpoint) have to make their *own* outbound POST to swap signed
 * assertions/secrets for an access token before the node's actual request can
 * go out. That extra request has nowhere to live in the normal node pipeline:
 *
 * - `authenticate(credentials, requestOptions)` is a plain mapper with no
 *   `this` — the node request helper simply isn't in scope. Its job is to
 *   decorate the *outgoing* request, not to issue side requests.
 * - Only `preAuthentication` receives `this.helpers.httpRequest`, but it runs
 *   at credential-resolution time, outside any node execution context, so
 *   reaching for the node helper there is the odd path, not the clean one.
 *
 * These POSTs used to call `axios` directly, which bypassed n8n's outbound HTTP
 * layer entirely (no SSRF guard, no proxy, no timeout).
 */
export function getTokenRequestClient(host: 'fixed-vendor' | 'user-controlled'): HttpRequestClient {
	const ssrf =
		host === 'fixed-vendor' || !Container.get(SsrfProtectionConfig).enabled
			? 'disabled'
			: Container.get(SsrfProtectionService);

	return Container.get(OutboundHttp).requests({ ssrf });
}
