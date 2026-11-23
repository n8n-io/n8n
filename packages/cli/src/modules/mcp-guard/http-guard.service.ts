import { OutboundHttp } from '@n8n/backend-network';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { HttpRunRegistry, REQUEST_TIMEOUT_MS } from './http-runs';
import { GUARDED_CALL_TIMEOUT_MS } from './mcp-guard-fetch';
import { sendToNetwork, type CapturedRequest } from './network';
import { HTTP_PROFILES } from './http-profiles';
import { SharedTenantAdmin } from './shared-tenants';
import type { NodeRequestGuardScope } from './node-request-guard';
import {
	canonicalHost,
	isTokenExchange,
	loadVendorKnowledge,
	vendorForRequest,
} from './vendor-knowledge';

// One gym serves every vendor and tells them apart by the host and the path of the request.
// AI_GYM_NODES_URL is its admin address. GYM_NODES_URL is its HTTP address.
const DEFAULT_ADMIN_URL = 'http://127.0.0.1:9093';
const DEFAULT_GYM_URL = 'http://127.0.0.1:8083';

const refusal = (status: number, text: string): Response => new Response(text, { status });

/** Answers the network calls of a guarded node tool: a read from the gym, a write only from the gym. */
@Service()
export class HttpGuardService {
	// One registry for each vendor. All of them use the same gym.
	private readonly registries: Map<string, HttpRunRegistry>;

	constructor(
		private readonly logger: Logger,
		outboundHttp: OutboundHttp,
	) {
		// Real reads use the proxy and egress settings of the instance.
		const fetchViaInstance = outboundHttp.transport({ proxy: 'env' }).asCustomFetch();
		const send = async (req: CapturedRequest) =>
			await sendToNetwork(req, { fetch: fetchViaInstance, timeoutMs: REQUEST_TIMEOUT_MS });
		const admin = new SharedTenantAdmin(process.env.AI_GYM_NODES_URL ?? DEFAULT_ADMIN_URL);
		const gymUrl = process.env.GYM_NODES_URL ?? DEFAULT_GYM_URL;
		this.registries = new Map(
			HTTP_PROFILES.map((profile) => [
				profile.name,
				new HttpRunRegistry({
					profile,
					vendor: loadVendorKnowledge(profile.name),
					admin,
					gymUrl,
					send,
				}),
			]),
		);
	}

	/** Answers a request of a node tool, or returns `undefined` to let the node send it as usual. */
	async handle(req: CapturedRequest, scope: NodeRequestGuardScope): Promise<Response | undefined> {
		if (!scope.chatId) return refusal(403, 'mcp-guard: no chat for this node tool');
		const host = canonicalHost(req.url.hostname);
		// A token exchange or refresh does not touch data. The node sends it as usual.
		if (isTokenExchange(req)) return undefined;
		const vendor = vendorForRequest(host, req.url.pathname);
		const registry = vendor && this.registries.get(vendor.name);
		if (!registry) return refusal(403, 'mcp-guard: this host is not available in a preview chat');

		let run;
		try {
			// One run, so one gym tenant, for each chat of the agent.
			run = await registry.getOrCreate(`${scope.agentId ?? 'agent'}-${scope.chatId}`, scope.model);
		} catch (e) {
			// The message can hold the address of the gym. Keep an address out of the log.
			const reason =
				e instanceof Error
					? e.message.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<url>')
					: 'unknown';
			this.logger.error(`mcp-guard http run setup failed: ${reason}`);
			return refusal(502, 'mcp-guard: the gym is not available');
		}
		// A hydration can need several model turns. Fail the call when it takes longer than a guarded call.
		const controller = new AbortController();
		let timer: NodeJS.Timeout | undefined;
		const timeout = new Promise<Response>((resolve) => {
			timer = setTimeout(() => {
				// Stop the model calls of the hydration, so they do not run on after the answer.
				controller.abort();
				resolve(refusal(504, 'mcp-guard: the preview call took too long'));
			}, GUARDED_CALL_TIMEOUT_MS);
		});
		try {
			return await Promise.race([run.router.handle(req, controller.signal), timeout]);
		} finally {
			clearTimeout(timer);
		}
	}
}
