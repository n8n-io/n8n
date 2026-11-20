import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { GymAdmin } from './gym-admin';
import { HttpRunRegistry } from './http-runs';
import type { CapturedRequest } from './network';
import { HTTP_PROFILES } from './http-profiles';
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
	private readonly registries = new Map<string, HttpRunRegistry>(this.createRegistries());

	constructor(private readonly logger: Logger) {}

	/** Answers a request of a node tool, or returns `undefined` to let the node send it as usual. */
	private createRegistries(): Array<[string, HttpRunRegistry]> {
		const admin = new GymAdmin(process.env.AI_GYM_NODES_URL ?? DEFAULT_ADMIN_URL);
		const gymUrl = process.env.GYM_NODES_URL ?? DEFAULT_GYM_URL;
		return HTTP_PROFILES.map((profile) => [
			profile.name,
			new HttpRunRegistry({ profile, vendor: loadVendorKnowledge(profile.name), admin, gymUrl }),
		]);
	}

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
		return await run.router.handle(req);
	}
}
