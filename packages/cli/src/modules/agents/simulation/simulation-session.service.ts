import type { AgentJsonConfig, ToolTestCapability } from '@n8n/api-types';
import { isCredentialAgentIntegration } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { Time } from '@n8n/constants';
import { In } from '@n8n/typeorm';
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
	/** The thread ID. One world per test chat. */
	testChatId: string;
	/** Seeds a new world. */
	message: string;
}

/** Decides whether a draft run is a test run, and gives it its test chat's session. */
@Service()
export class SimulationSessionService {
	private readonly sessions = new TtlMap<string, SimulationSession>(
		30 * Time.minutes.toMilliseconds,
	);

	private readonly opening = new Map<string, Promise<SimulationSession | undefined>>();

	constructor(
		private readonly logger: Logger,
		private readonly flagGate: SafeTestingFlagGate,
		private readonly registry: SimulationBackendRegistry,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly agentRepository: AgentRepository,
		private readonly skillRefs: AgentSkillRefsService,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async openForDraftRun(input: OpenSimulationInput): Promise<SimulationSession | undefined> {
		// A chat that is already a test run stays one, even if the flag reads off for a moment.
		const key = sessionKey(input);
		const cached = this.sessions.get(key);
		if (cached) {
			this.sessions.touch(key);
			// Keep the same session, so its cached runtime stays valid, but use the current tools.
			cached.updateCapabilities(
				await this.capabilitiesFor(await this.describeAgent(input.agentId, input.projectId)),
			);
			return cached;
		}
		// Overlapping turns of a new chat share one open, so the chat gets one world.
		const opening = this.opening.get(key);
		if (opening) return await opening;
		const open = this.openNew(input).finally(() => this.opening.delete(key));
		this.opening.set(key, open);
		return await open;
	}

	private async openNew(input: OpenSimulationInput): Promise<SimulationSession | undefined> {
		if (!(await this.flagGate.isEnabled(input.user))) return undefined;

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
			queueMode: this.executionsConfig.mode === 'queue',
		});
		this.sessions.set(sessionKey(input), session);
		return session;
	}

	async markExecutionSimulated(executionId: string): Promise<void> {
		await this.executionRepository.update({ id: executionId }, { simulated: true });
	}

	/** Testability of each tool, before the run starts. */
	async describeTools(agentId: string, projectId: string): Promise<ToolTestCapability[]> {
		return await this.capabilitiesFor(await this.describeAgent(agentId, projectId));
	}

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
		for (const [toolName, gap] of await this.workflowEngineGaps(config)) {
			if (!hostGaps.has(toolName)) hostGaps.set(toolName, gap);
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

	/**
	 * Workflow tools whose workflow runs on Engine v2. The run would go to the data plane,
	 * where the test run's hooks do not reach; the runtime refuses it as well.
	 */
	private async workflowEngineGaps(config: AgentJsonConfig): Promise<Map<string, string>> {
		const gaps = new Map<string, string>();
		const refs = (config.tools ?? []).flatMap((ref) =>
			ref.type === 'workflow' && ref.enabled !== false && ref.workflowId ? [ref] : [],
		);
		if (refs.length === 0) return gaps;
		const workflows = await this.workflowRepository.find({
			where: { id: In(refs.flatMap((ref) => (ref.workflowId ? [ref.workflowId] : []))) },
			select: ['id', 'settings'],
		});
		const onEngineV2 = new Set(
			workflows.filter((workflow) => workflow.settings?.engineType === 'v2').map(({ id }) => id),
		);
		for (const ref of refs) {
			if (!ref.workflowId || !onEngineV2.has(ref.workflowId)) continue;
			gaps.set(
				sanitizeToolName(ref.name ?? ref.workflow),
				'Workflows that run on Engine v2 cannot run in a test run yet.',
			);
		}
		return gaps;
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

/** A session belongs to one chat of one agent and user, so a reused chat ID never shares a world. */
function sessionKey({ user, projectId, agentId, testChatId }: OpenSimulationInput): string {
	return `${user.id}:${projectId}:${agentId}:${testChatId}`;
}
