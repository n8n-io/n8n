import type { AgentJsonConfig, ToolTestCapability } from '@n8n/api-types';
import { isCredentialAgentIntegration } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { Time } from '@n8n/constants';
import { nodeNameToToolName } from 'n8n-workflow';

import { TtlMap } from '@/utils/ttl-map';

import { AgentSkillRefsService } from '../agent-skill-refs.service';
import { summarizeTools } from '../evaluation/evaluation-config';
import { sanitizeToolName } from '../json-config/agent-config-composition';
import { toAgentDocument } from '../json-config/agent-document';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { nodeSimulationGap } from './non-http-node-types';
import { SafeTestingFlagGate } from './safe-testing-flag-gate';
import { SimulationBackendRegistry } from './simulation-backend-registry';
import { SimulationSession } from './simulation-session';
import type { SimulatedAgent, SimulatedTool, SimulationWorld } from './tool-simulation.contracts';

export interface OpenSimulationInput {
	user: User;
	agentId: string;
	projectId: string;
	/** The test chat (thread) ID. One world for each test chat. */
	testChatId: string;
	/** The user message of this turn. Seeds a new world. */
	message: string;
}

/**
 * Decides whether a draft run is a test run and gives it the session of its
 * test chat. With the flag off, draft runs stay live.
 */
@Service()
export class SimulationSessionService {
	private readonly sessions = new TtlMap<string, SimulationSession>(
		30 * Time.minutes.toMilliseconds,
	);

	constructor(
		private readonly logger: Logger,
		private readonly flagGate: SafeTestingFlagGate,
		private readonly registry: SimulationBackendRegistry,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly agentRepository: AgentRepository,
		private readonly skillRefs: AgentSkillRefsService,
		private readonly executionRepository: AgentExecutionRepository,
	) {}

	/** The session of a test run, or `undefined` for a live run. */
	async openForDraftRun(input: OpenSimulationInput): Promise<SimulationSession | undefined> {
		if (!(await this.flagGate.isEnabled(input.user))) return undefined;
		const cached = this.sessions.get(input.testChatId);
		if (cached) {
			this.sessions.touch(input.testChatId);
			// Keep the same session, so its cached runtime stays valid, but use the current tools.
			cached.updateCapabilities(
				await this.capabilitiesFor(await this.describeAgent(input.agentId, input.projectId)),
			);
			return cached;
		}

		const described = await this.describeAgent(input.agentId, input.projectId);
		const capabilities = await this.capabilitiesFor(described);
		const { agent } = described;
		const backend = this.registry.get();
		let world: SimulationWorld | undefined;
		let unavailableDetail: string | undefined;
		if (!backend) {
			unavailableDetail = 'No simulator is set up on this instance.';
		} else {
			try {
				world = await backend.openWorld({
					testChatId: input.testChatId,
					agent,
					firstMessage: input.message,
				});
			} catch (error) {
				unavailableDetail = 'The simulator could not start.';
				this.logger.warn('[SafeTesting] Failed to open a simulated world', {
					agentId: input.agentId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		const session = new SimulationSession({
			testChatId: input.testChatId,
			world,
			unavailableDetail,
			capabilities,
		});
		this.sessions.set(input.testChatId, session);
		return session;
	}

	async markExecutionSimulated(executionId: string): Promise<void> {
		await this.executionRepository.update({ id: executionId }, { simulated: true });
	}

	/** Which tools of an agent can run in a test run, before the run starts. */
	async describeTools(agentId: string, projectId: string): Promise<ToolTestCapability[]> {
		return await this.capabilitiesFor(await this.describeAgent(agentId, projectId));
	}

	/** The agent's tools, plus the reason n8n blocks a tool before any backend sees it. */
	private async describeAgent(agentId: string, projectId: string): Promise<DescribedAgent> {
		const saved = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!saved?.schema) throw new NotFoundError(`Agent ${agentId} not found`);
		const refs = await this.skillRefs.refsForDraft(saved, {});
		const config: AgentJsonConfig = toAgentDocument(structuredClone(saved.schema), refs);
		const hostGaps = new Map<string, string>();

		const tools: SimulatedTool[] = [];
		for (const tool of summarizeTools(config, saved.tools ?? {}, sanitizeToolName)) {
			const kind = tool.kind === 'other' && tool.name === 'web_search' ? 'web_search' : tool.kind;
			tools.push({
				toolName: tool.name,
				kind,
				...(tool.description ? { description: tool.description } : {}),
				...(tool.nodeType ? { nodeType: tool.nodeType } : {}),
			});
			const gap = this.hostGap(kind);
			if (gap) hostGaps.set(tool.name, gap);
		}
		for (const ref of config.tools ?? []) {
			if (ref.type !== 'node' || ref.enabled === false) continue;
			const gap = nodeSimulationGap(ref.node.nodeType, ref.node.nodeParameters);
			if (gap) hostGaps.set(nodeNameToToolName(ref.name), gap);
		}
		for (const integration of saved.integrations ?? []) {
			if (!isCredentialAgentIntegration(integration)) continue;
			tools.push({ toolName: integration.type, kind: 'integration' });
			hostGaps.set(integration.type, 'Chat integration actions cannot run in a test run yet.');
		}

		return {
			agent: {
				agentId,
				projectId,
				name: config.name,
				instructions: config.instructions ?? '',
				tools,
			},
			hostGaps,
		};
	}

	private hostGap(kind: SimulatedTool['kind']): string | undefined {
		switch (kind) {
			case 'custom':
				return 'Custom code tools can reach any service, so they cannot run in a test run yet.';
			case 'other':
				return 'This kind of tool cannot run in a test run yet.';
			case 'workflow':
				// The tool hooks cannot reach a workflow that runs on a queue worker.
				return this.executionsConfig.mode === 'queue'
					? 'Workflow tools cannot run in a test run in queue mode yet.'
					: undefined;
			case 'mcp':
				return 'MCP servers cannot run in a test run yet.';
			case 'web_search':
				return 'Web search cannot run in a test run yet.';
			default:
				return undefined;
		}
	}

	/**
	 * n8n's own rules come first: a tool that no simulator can serve is blocked
	 * before the backend sees it. The backend answers for the rest. A tool that
	 * the backend leaves out is blocked.
	 */
	private async capabilitiesFor({
		agent,
		hostGaps,
	}: DescribedAgent): Promise<ToolTestCapability[]> {
		const forBackend = agent.tools.filter((tool) => !hostGaps.has(tool.toolName));
		const backend = this.registry.get();
		let served = new Map<string, ToolTestCapability>();
		if (backend && forBackend.length > 0) {
			try {
				const described = await backend.describeTools({ ...agent, tools: forBackend });
				served = new Map(described.map((tool) => [tool.toolName, tool]));
			} catch (error) {
				this.logger.warn('[SafeTesting] The simulator failed to describe tools', {
					agentId: agent.agentId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return agent.tools.map((tool): ToolTestCapability => {
			const blocked = (
				reason: ToolTestCapability['reason'],
				detail: string,
			): ToolTestCapability => ({
				toolName: tool.toolName,
				kind: tool.kind,
				testability: 'blocked',
				reason,
				detail,
			});
			const gap = hostGaps.get(tool.toolName);
			if (gap) return blocked('not_simulatable', gap);
			if (!backend)
				return blocked('simulator_unavailable', 'No simulator is set up on this instance.');
			return (
				served.get(tool.toolName) ??
				blocked('unsupported_by_simulator', 'The simulator does not support this tool yet.')
			);
		});
	}
}

interface DescribedAgent {
	agent: SimulatedAgent;
	/** Tools that n8n blocks before any backend sees them, with the reason. */
	hostGaps: Map<string, string>;
}
