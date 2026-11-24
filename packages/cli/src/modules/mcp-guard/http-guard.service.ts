import { OutboundHttp } from '@n8n/backend-network';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { GymAdmin } from './gym-admin';
import { HttpRunRegistry, REQUEST_TIMEOUT_MS } from './http-runs';
import { GUARDED_CALL_TIMEOUT_MS } from './mcp-guard-fetch';
import { sendToNetwork, type CapturedRequest } from './network';
import { HTTP_PROFILES, type HttpVendorProfile } from './http-profiles';
import type { NodeRequestGuardScope } from './node-request-guard';
import {
	canonicalHost,
	isTokenExchange,
	loadVendorKnowledge,
	vendorForRequest,
} from './vendor-knowledge';

// Env per vendor: AI_GYM_<NAME>_URL is the admin address, GYM_<NAME>_URL the HTTP address of the gym.
function runConfig(profile: HttpVendorProfile) {
	const key = profile.name.toUpperCase();
	return {
		profile,
		vendor: loadVendorKnowledge(profile.name),
		admin: new GymAdmin(process.env[`AI_GYM_${key}_URL`] ?? profile.defaultAdminUrl),
		gymUrl: process.env[`GYM_${key}_URL`] ?? profile.defaultGymUrl,
	};
}

const refusal = (status: number, text: string): Response => new Response(text, { status });

/** Answers the network calls of a guarded node tool: a read from the gym, a write only from the gym. */
@Service()
export class HttpGuardService {
	// One registry for each vendor. Each vendor can use its own gym process.
	private readonly registries: Map<string, HttpRunRegistry>;

	constructor(
		private readonly logger: Logger,
		outboundHttp: OutboundHttp,
	) {
		// Real reads use the proxy and egress settings of the instance.
		const fetchViaInstance = outboundHttp.transport({ proxy: 'env' }).asCustomFetch();
		const send = async (req: CapturedRequest) =>
			await sendToNetwork(req, { fetch: fetchViaInstance, timeoutMs: REQUEST_TIMEOUT_MS });
		this.registries = new Map(
			HTTP_PROFILES.map((profile) => [
				profile.name,
				new HttpRunRegistry({ ...runConfig(profile), send }),
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
		let timer: NodeJS.Timeout | undefined;
		const timeout = new Promise<Response>((resolve) => {
			timer = setTimeout(
				() => resolve(refusal(504, 'mcp-guard: the preview call took too long')),
				GUARDED_CALL_TIMEOUT_MS,
			);
		});
		try {
			return await Promise.race([run.router.handle(req), timeout]);
		} finally {
			clearTimeout(timer);
		}
	}
}
