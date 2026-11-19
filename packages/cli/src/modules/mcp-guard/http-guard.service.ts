import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { currentAgentId, currentChatId, currentNodeGuard } from './chat-scope';
import { GymAdmin } from './gym-admin';
import { HttpRunRegistry } from './http-runs';
import { HTTP_PROFILES, type HttpVendorProfile } from './http-profiles';
import { sendToNetwork, type CapturedRequest } from './net-interceptor';
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
	private readonly registries = new Map<string, HttpRunRegistry>(
		HTTP_PROFILES.map((profile) => [profile.name, new HttpRunRegistry(runConfig(profile))]),
	);

	constructor(private readonly logger: Logger) {}

	async handle(req: CapturedRequest): Promise<Response> {
		const guard = currentNodeGuard();
		const chatId = currentChatId();
		if (!guard || !chatId) return refusal(403, 'mcp-guard: no guarded node tool');
		const host = canonicalHost(req.url.hostname);
		// A token exchange or refresh does not touch data. It goes to the real network.
		if (isTokenExchange(req)) return await sendToNetwork(req);
		const vendor = vendorForRequest(host, req.url.pathname);
		const registry = vendor && this.registries.get(vendor.name);
		if (!registry) return refusal(403, 'mcp-guard: this host is not available in a preview chat');

		let run;
		try {
			// One run, so one gym tenant, for each chat of the agent.
			run = await registry.getOrCreate(`${currentAgentId() ?? 'agent'}-${chatId}`, guard.model);
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
