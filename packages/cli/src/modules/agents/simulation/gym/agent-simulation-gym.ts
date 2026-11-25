import { Service } from '@n8n/di';

/**
 * What a test chat needs from the in-process AI Gym (`@n8n/ai-gym`). The module that loads the Gym
 * binds it to `AgentSimulationGymProvider`.
 *
 * The port speaks in Gym vendors and requests, never in n8n credentials: the Gym mints the token a
 * tenant accepts and signs the request itself, so no stored secret reaches it.
 */
export interface AgentSimulationGym {
	/** The Gym vendor that serves an n8n node type, for example `slack` for `n8n-nodes-base.slack`. */
	vendorForNodeType(nodeType: string): Promise<string | undefined>;

	/** The Gym vendor that serves a host, for example `slack` for `slack.com`. */
	vendorForHost(host: string): Promise<string | undefined>;

	/** Opens an empty tenant. Each test chat world gets its own. */
	openTenant(id: string): Promise<AgentSimulationGymTenant>;
}

/**
 * Holds the Gym once a module binds it. Until then the Gym backend reports the simulator as
 * unavailable, so the order in which modules start does not matter.
 */
@Service()
export class AgentSimulationGymProvider {
	private gym: AgentSimulationGym | undefined;

	bind(gym: AgentSimulationGym): void {
		this.gym = gym;
	}

	get(): AgentSimulationGym | undefined {
		return this.gym;
	}
}

export interface AgentSimulationGymTenant {
	readonly id: string;

	/**
	 * Answers one request for a vendor in this tenant, signed with a token the tenant minted.
	 * `undefined` when the Gym does not simulate the host. `signal` aborts when the test run stops,
	 * so the Gym can drop the work.
	 */
	handle(
		vendor: string,
		request: GymRequest,
		options?: { signal?: AbortSignal },
	): Promise<GymResponse | undefined>;

	/** Frees the tenant. Safe to call more than once. */
	close(): Promise<void>;
}

/** The subset of n8n's request options the Gym request handler reads. */
export interface GymRequest {
	method: string;
	url: string;
	headers?: Record<string, string>;
	body?: unknown;
}

export interface GymResponse {
	statusCode: number;
	/** `set-cookie` can be a list. */
	headers: Record<string, string | string[]>;
	body: unknown;
}
