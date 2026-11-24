import { randomUUID } from 'node:crypto';

import type { ToolCallEvidence, ToolTestCapability } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

import type {
	OpenWorldInput,
	OutboundRequest,
	SimulatedAgent,
	SimulatedReply,
	SimulatedTool,
	SimulationBackend,
	SimulationWorld,
} from '../tool-simulation.contracts';
import {
	type AgentSimulationGym,
	AgentSimulationGymProvider,
	type AgentSimulationGymTenant,
	type GymResponse,
} from './agent-simulation-gym';

/** The node reaches whatever host its URL names, so the Gym decides per request. */
const HTTP_REQUEST_NODE_TYPES = new Set([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.httpRequestTool',
]);

/** Its nodes run in this process, and each request they send goes through the world. */
const PER_REQUEST_KINDS = new Set<SimulatedTool['kind']>(['workflow']);

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** The Gym answers these when a tenant or a request is over its fixed capacity. */
const CAPACITY_STATUSES = new Set([413, 507]);

/**
 * Simulation backend on the in-process AI Gym. Each test chat world is one Gym tenant. A reply
 * comes from the tenant's state, so a later read sees an earlier write. A request the Gym cannot
 * serve is blocked. Nothing falls back to the LLM mock or to the real service.
 */
@Service()
export class GymSimulationBackend implements SimulationBackend {
	readonly id = 'shared-simulation-layer' as const;

	private readonly tenants = new Map<string, AgentSimulationGymTenant>();

	constructor(
		private readonly gymProvider: AgentSimulationGymProvider,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('agents');
	}

	async describeTools(agent: SimulatedAgent): Promise<ToolTestCapability[]> {
		const gym = this.gymProvider.get();
		if (!gym) {
			return agent.tools.map((tool) => ({
				toolName: tool.toolName,
				kind: tool.kind,
				testability: 'blocked',
				reason: 'simulator_unavailable',
				detail: GYM_MISSING,
			}));
		}
		return await Promise.all(agent.tools.map(async (tool) => await this.describeTool(gym, tool)));
	}

	private async describeTool(
		gym: AgentSimulationGym,
		tool: SimulatedTool,
	): Promise<ToolTestCapability> {
		const simulated = {
			toolName: tool.toolName,
			kind: tool.kind,
			testability: 'simulated',
		} as const;
		if (PER_REQUEST_KINDS.has(tool.kind)) return simulated;
		if (tool.kind === 'node' && tool.nodeType) {
			if (HTTP_REQUEST_NODE_TYPES.has(tool.nodeType)) return simulated;
			if (await gym.vendorForNodeType(tool.nodeType)) return simulated;
			return unsupportedTool(tool, `The test world does not have ${tool.nodeType} yet.`);
		}
		return unsupportedTool(tool, KIND_GAPS[tool.kind] ?? 'The test world cannot run this tool.');
	}

	async openWorld({ testChatId }: OpenWorldInput): Promise<SimulationWorld> {
		const gym = this.gymProvider.get();
		if (!gym) throw new UnexpectedError(GYM_MISSING);
		// A new world after a restart must not reuse a tenant a previous world held.
		const tenant = await gym.openTenant(`agent-test-${testChatId}-${randomUUID()}`);
		this.tenants.set(tenant.id, tenant);
		return {
			worldId: tenant.id,
			backend: this.id,
			handleRequest: async (request) => await this.handleRequest(gym, tenant, request),
		};
	}

	async closeWorld(worldId: string): Promise<void> {
		const tenant = this.tenants.get(worldId);
		this.tenants.delete(worldId);
		await tenant?.close();
	}

	private async handleRequest(
		gym: AgentSimulationGym,
		tenant: AgentSimulationGymTenant,
		request: OutboundRequest,
	): Promise<SimulatedReply> {
		if (request.protocol === 'mcp') {
			return { outcome: 'unsupported', detail: KIND_GAPS.mcp };
		}
		if (request.protocol === 'web_search') {
			return { outcome: 'unsupported', detail: KIND_GAPS.web_search };
		}

		let url: URL;
		try {
			url = new URL(request.url);
		} catch {
			return { outcome: 'unsupported', detail: 'The request has no valid URL.' };
		}

		const { host, pathname } = url;
		let vendor: string | undefined;
		let response: GymResponse | undefined;
		try {
			vendor = await gym.vendorForHost(host);
			if (!vendor)
				return { outcome: 'unsupported', detail: `The test world does not have ${host}.` };
			response = await tenant.handle(vendor, {
				method: request.method,
				url: request.url,
				headers: request.headers,
				body: request.body,
			});
		} catch (error) {
			this.logger.warn('The test world failed to answer a request', {
				host,
				error: error instanceof Error ? error.message : String(error),
			});
			return { outcome: 'unavailable', detail: 'The test world failed to answer.' };
		}

		if (!response || response.statusCode === 501) {
			return {
				outcome: 'unsupported',
				detail: `The test world does not support ${request.method} ${host}${pathname} yet.`,
			};
		}
		if (CAPACITY_STATUSES.has(response.statusCode)) {
			return { outcome: 'unavailable', detail: 'The test world is full.' };
		}

		const evidence: ToolCallEvidence = READ_METHODS.has(request.method.toUpperCase())
			? 'world_read'
			: 'world_write';
		return {
			outcome: 'served',
			source: 'world_state',
			evidence: [evidence],
			status: response.statusCode,
			headers: flattenHeaders(response.headers),
			body: response.body,
		};
	}
}

const GYM_MISSING = 'No module provides the test world.';

const KIND_GAPS: Partial<Record<SimulatedTool['kind'], string>> = {
	mcp: 'The test world does not have MCP servers yet.',
	web_search: 'The test world does not have web search yet.',
};

function unsupportedTool(tool: SimulatedTool, detail: string): ToolTestCapability {
	return {
		toolName: tool.toolName,
		kind: tool.kind,
		testability: 'blocked',
		reason: 'unsupported_by_simulator',
		detail,
	};
}

function flattenHeaders(headers: GymResponse['headers']): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers)) {
		result[name] = Array.isArray(value) ? value.join(', ') : value;
	}
	return result;
}
