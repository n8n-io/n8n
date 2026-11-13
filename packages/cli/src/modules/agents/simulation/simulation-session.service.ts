import type { AgentJsonConfig, ToolTestCapability } from '@n8n/api-types';
import { isCredentialAgentIntegration } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError, UnexpectedError } from '@n8n/errors';

import { Time } from '@n8n/constants';
import { isDeepStrictEqual } from 'node:util';
import { jsonParse, nodeNameToToolName } from 'n8n-workflow';

import { TtlMap } from '@/utils/ttl-map';

import { AgentSkillRefsService } from '../agent-skill-refs.service';
import { summarizeTools } from '../evaluation/evaluation-config';
import { sanitizeToolName } from '../json-config/agent-config-composition';
import { toAgentDocument } from '../json-config/agent-document';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { getIntegrationToolConnectionDescriptors } from '../integrations/integration-tool-factory';
import { findWorkflowToolWorkflows } from '../tools/workflow-tool-workflow-resolver';
import { nodeSimulationGap } from './non-http-node-types';
import { simulatorMcpUrls } from './outbound-redaction';
import { SafeTestingFlagGate } from './safe-testing-flag-gate';
import { SimulationBackendRegistry } from './simulation-backend-registry';
import { SimulationSession } from './simulation-session';
import type {
	SimulatedAgent,
	SimulatedTool,
	SimulationWorld,
	StoredTestChat,
} from './tool-simulation.contracts';

export interface OpenSimulationInput {
	user: User;
	agentId: string;
	projectId: string;
	/** The thread ID. One world per test chat. */
	testChatId: string;
	/** Seeds a new world. */
	message: string;
	/**
	 * The caller asked for a test run (preview chat in `test` mode). Without it a new chat runs
	 * live even with the flag on, so nothing changes until the panel lets users choose.
	 */
	testRunRequested?: boolean;
}

/** Decides whether a draft run is a test run. A marked test chat stays one, also with the flag off. */
@Service()
export class SimulationSessionService {
	private readonly sessions = new TtlMap<string, SimulationSession>(
		30 * Time.minutes.toMilliseconds,
	);

	private readonly opening = new Map<string, Promise<SimulationSession | undefined>>();

	/** What each cached session last read from or wrote to its thread. */
	private readonly knownStored = new WeakMap<SimulationSession, StoredTestChat | null>();

	private readonly sessionKeys = new WeakMap<SimulationSession, string>();

	constructor(
		private readonly logger: Logger,
		private readonly flagGate: SafeTestingFlagGate,
		private readonly registry: SimulationBackendRegistry,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly agentRepository: AgentRepository,
		private readonly skillRefs: AgentSkillRefsService,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async openForDraftRun(input: OpenSimulationInput): Promise<SimulationSession | undefined> {
		// A chat that is already a test run stays one, even if the flag reads off for a moment.
		const key = sessionKey(input);
		const cached = this.sessions.get(key);
		// Another main may have run a turn since, and its world is newer than the cached one.
		if (cached && (await this.storedChanged(cached))) this.sessions.delete(key);
		else if (cached) {
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
		const thread = await this.threadRepository.findOneBy({ id: input.testChatId });
		const stored = thread?.simulation ?? undefined;
		// A test chat stays one. A new chat is a test run only when asked for, with the flag on.
		if (!stored && (!input.testRunRequested || !(await this.flagGate.isEnabled(input.user)))) {
			return undefined;
		}
		const savedWorld = stored?.world;

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
					// Tools n8n blocks (SSE MCP servers, custom code) stay out of the world too.
					agent: {
						...agent,
						tools: agent.tools.filter((tool) => !described.hostGaps.has(tool.toolName)),
					},
					firstMessage: input.message,
					...(savedWorld?.backend === backend.id ? { saved: savedWorld.state } : {}),
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
			// Real URLs, to name the server of each request; the simulator gets its own URL.
			mcpServers: described.mcpServers,
			recordTestChat: async (current, executionId) => {
				await this.saveTestChat(current);
				// Before the agent runs, so the execution is a test run even if the turn never ends.
				if (executionId) await this.markExecutionSimulated(executionId);
			},
			queueMode: this.executionsConfig.mode === 'queue',
			previousWorld: savedWorld,
		});
		this.knownStored.set(session, asStored(stored ?? null));
		this.sessionKeys.set(session, sessionKey(input));
		this.sessions.set(sessionKey(input), session);
		return session;
	}

	/**
	 * Store the test chat marker and the world on the thread, so later turns,
	 * restarts and other mains continue the same test run. A failed write fails
	 * the turn rather than letting a later turn run live.
	 */
	/**
	 * `onConflict: 'skip'` keeps the newer world another main stored since this session
	 * last saw it; `'throw'` (before a turn runs) fails the turn instead of overwriting it.
	 */
	async saveTestChat(
		session: SimulationSession,
		{ onConflict = 'throw' }: { onConflict?: 'throw' | 'skip' } = {},
	): Promise<void> {
		if (await this.storedChanged(session)) {
			this.dropSession(session);
			if (onConflict === 'skip') {
				this.logger.warn('[SafeTesting] Kept a newer simulated world stored by another turn', {
					testChatId: session.testChatId,
				});
				return;
			}
			throw new UnexpectedError(
				'This test chat changed somewhere else while this message was starting. Send it again.',
			);
		}
		const stored = session.storedTestChat();
		const result = await this.threadRepository.update(
			{ id: session.testChatId },
			{ simulation: stored },
		);
		// Without a stored marker a later turn could run live, so the turn must not go on.
		if (result?.affected === 0) {
			throw new UnexpectedError('Could not mark the test chat, so this test run cannot start.');
		}
		this.knownStored.set(session, asStored(stored));
	}

	private dropSession(session: SimulationSession): void {
		const key = this.sessionKeys.get(session);
		if (key !== undefined && this.sessions.get(key) === session) this.sessions.delete(key);
	}

	private async storedChanged(session: SimulationSession): Promise<boolean> {
		const thread = await this.threadRepository.findOneBy({ id: session.testChatId });
		return !isDeepStrictEqual(thread?.simulation ?? null, this.knownStored.get(session) ?? null);
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
		const mcpUrls = simulatorMcpUrls(config.mcpServers ?? []);
		// The runtime leaves disabled tools out, so the list does too.
		const enabledConfig = {
			...config,
			tools: config.tools?.filter((ref) => ref.enabled !== false),
		};
		for (const tool of summarizeTools(enabledConfig, saved.tools ?? {}, sanitizeToolName)) {
			const kind = tool.kind === 'other' && tool.name === 'web_search' ? 'web_search' : tool.kind;
			const server =
				kind === 'mcp' ? config.mcpServers?.find((entry) => entry.name === tool.name) : undefined;
			const simulatorUrl = server ? mcpUrls.get(server.name) : undefined;
			// A server without a description is described by its URL, which can carry a key.
			const description =
				server && simulatorUrl && tool.description
					? tool.description.split(server.url).join(simulatorUrl)
					: tool.description;
			tools.push({
				toolName: tool.name,
				kind,
				...(description ? { description } : {}),
				...(tool.nodeType ? { nodeType: tool.nodeType } : {}),
				// The simulator matches requests to servers by this URL; the session sends the same one.
				...(simulatorUrl ? { url: simulatorUrl } : {}),
			});
			const gap = this.hostGap(kind, server?.transport);
			if (gap) hostGaps.set(tool.name, gap);
		}
		// Test runs leave out the provider's native search and attach the fallback tool,
		// which summarizeTools does not list when native search is configured.
		if (config.config?.webSearch?.enabled && !tools.some((tool) => tool.kind === 'web_search')) {
			tools.push({
				toolName: 'web_search',
				kind: 'web_search',
				description: 'Web search returning {title, url, snippet} result lists',
			});
		}
		for (const ref of config.tools ?? []) {
			if (ref.type !== 'node' || ref.enabled === false) continue;
			const gap = nodeSimulationGap(ref.node.nodeType, ref.node.nodeParameters);
			if (gap) hostGaps.set(nodeNameToToolName(ref.name), gap);
		}
		for (const [toolName, gap] of await this.workflowEngineGaps(enabledConfig, projectId)) {
			if (!hostGaps.has(toolName)) hostGaps.set(toolName, gap);
		}
		// Named as the runtime names them: `slack_context`, `slack_action`, `slack_2_action`.
		const integrations = (saved.integrations ?? []).filter(isCredentialAgentIntegration);
		for (const descriptor of getIntegrationToolConnectionDescriptors(integrations, agentId)) {
			for (const toolName of [descriptor.contextToolName, descriptor.actionToolName]) {
				tools.push({ toolName, kind: 'integration' });
				hostGaps.set(toolName, 'Chat integration tools cannot run in a test run yet.');
			}
		}

		return {
			agent: {
				agentId,
				projectId,
				name: config.name,
				instructions: config.instructions ?? '',
				tools,
			},
			mcpServers: (config.mcpServers ?? []).map((server) => ({
				name: server.name,
				url: server.url,
				simulatorUrl: mcpUrls.get(server.name) ?? '',
			})),
			hostGaps,
		};
	}

	/**
	 * Workflow tools whose workflow runs on Engine v2. The run would go to the data plane,
	 * where the test run's hooks do not reach; the runtime refuses it as well. Legacy refs
	 * without an id are found by name, as the runtime finds them.
	 */
	private async workflowEngineGaps(
		config: AgentJsonConfig,
		projectId: string,
	): Promise<Map<string, string>> {
		const gaps = new Map<string, string>();
		const refs = (config.tools ?? []).flatMap((ref) => (ref.type === 'workflow' ? [ref] : []));
		if (refs.length === 0) return gaps;
		const workflows = await findWorkflowToolWorkflows(this.workflowRepository, refs, projectId);
		for (const ref of refs) {
			const workflow = workflows.get(ref.workflowId ?? ref.workflow);
			if (workflow?.settings?.engineType !== 'v2') continue;
			gaps.set(
				sanitizeToolName(ref.name ?? ref.workflow),
				'Workflows that run on Engine v2 cannot run in a test run yet.',
			);
		}
		return gaps;
	}

	private hostGap(kind: SimulatedTool['kind'], mcpTransport?: string): string | undefined {
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
				return mcpTransport === 'sse'
					? 'MCP servers that use the SSE transport cannot run in a test run yet.'
					: undefined;
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
		let describeFailed = false;
		if (backend && forBackend.length > 0) {
			try {
				const described = await backend.describeTools({ ...agent, tools: forBackend });
				served = new Map(described.map((tool) => [tool.toolName, withBlockReason(tool)]));
			} catch (error) {
				describeFailed = true;
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
			if (describeFailed) {
				return blocked('simulator_unavailable', 'The simulator could not describe its tools.');
			}
			return (
				served.get(tool.toolName) ??
				blocked('unsupported_by_simulator', 'The simulator does not support this tool yet.')
			);
		});
	}
}

interface DescribedAgent {
	agent: SimulatedAgent;
	/** Configured MCP servers with their real URL and the URL the simulator sees. */
	mcpServers: Array<{ name: string; url: string; simulatorUrl: string }>;
	/** Tools that n8n blocks before any backend sees them, with the reason. */
	hostGaps: Map<string, string>;
}

/** A session belongs to one chat of one agent and user, so a reused chat ID never shares a world. */
function sessionKey({ user, projectId, agentId, testChatId }: OpenSimulationInput): string {
	return `${user.id}:${projectId}:${agentId}:${testChatId}`;
}

/** A backend that blocks a tool without saying why still gets a reason the panel can show. */
function withBlockReason(tool: ToolTestCapability): ToolTestCapability {
	if (tool.testability !== 'blocked' || tool.reason) return tool;
	return { ...tool, reason: 'unsupported_by_simulator' };
}

/** As the thread column stores it: JSON drops `undefined` fields, so compare that form. */
function asStored(stored: StoredTestChat | null): StoredTestChat | null {
	return stored === null ? null : jsonParse<StoredTestChat>(JSON.stringify(stored));
}
