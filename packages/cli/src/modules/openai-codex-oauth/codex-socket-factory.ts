import { setCodexSocketFactory, type CodexSocket } from '@n8n/agents';
import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- the connection is NOT uncentralized: every socket is dispatched through OutboundHttp's guarded dispatcher below, so SSRF and proxy policy still apply. Only the WebSocket class itself comes from undici, because @n8n/backend-network exposes no WebSocket wrapper. To drop this: add one there and use it here.
import { WebSocket } from 'undici';

/**
 * Lets `@n8n/agents` open Codex WebSockets through n8n's guarded transport.
 *
 * The agents package deliberately owns no outbound connection of its own, so
 * without this registration the Codex transport stays on SSE. Routing the
 * upgrade through `OutboundHttp`'s dispatcher keeps SSRF and proxy policy in
 * force, exactly as for the SSE path.
 */
export function registerCodexSocketFactory(): () => void {
	return setCodexSocketFactory((url, headers) => {
		const dispatcher = Container.get(OutboundHttp).transport().getDispatcher();
		return new WebSocket(url, { headers, dispatcher }) as unknown as CodexSocket;
	});
}
