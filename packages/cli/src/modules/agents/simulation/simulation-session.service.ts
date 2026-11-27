import { createHash } from 'node:crypto';

import type { AgentJsonConfig, ToolTestCapability } from '@n8n/api-types';
import { AI_GATEWAY_MANAGED_TAG, isCredentialAgentIntegration } from '@n8n/api-types';
import { CredentialsFinderService } from '@n8n/backend-services';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository, type User } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { NotFoundError, UnexpectedError, UserError } from '@n8n/errors';

import { Time } from '@n8n/constants';
import { nodeNameToToolName } from 'n8n-workflow';

import { TtlMap } from '@/utils/ttl-map';

import { AgentSkillRefsService } from '../agent-skill-refs.service';
import { summarizeTools } from '../evaluation/evaluation-config';
import { sanitizeToolName } from '../json-config/agent-config-composition';
import { toAgentDocument } from '../json-config/agent-document';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import { getIntegrationToolConnectionDescriptors } from '../integrations/integration-tool-factory';
import { instrumentedRunGap } from '../tools/instrumented-run-guard';
import { findWorkflowToolWorkflows } from '../tools/workflow-tool-workflow-resolver';
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
	/**
	 * The caller asked for a test run (preview chat in `test` mode). Without it a new chat runs
	 * live even with the flag on, so nothing changes until the panel lets users choose.
	 */
	testRunRequested?: boolean;
}

/** Decides whether a draft run is a test run. A marked test chat stays one, also with the flag off. */
@Service()
export class SimulationSessionService {
	private readonly sessions = new TtlMap<string, CachedSession>(
		30 * Time.minutes.toMilliseconds,
		// A short sweep closes an idle world soon after it expires.
		5 * Time.minutes.toMilliseconds,
		// An expired world is never served again, so the backend can delete what it holds.
		(expired) => {
			void this.closeWorld(expired.session);
		},
	);

	private readonly opening = new Map<string, Promise<SimulationSession | undefined>>();

	constructor(
		private readonly logger: Logger,
		private readonly flagGate: SafeTestingFlagGate,
		private readonly registry: SimulationBackendRegistry,
		private readonly agentRepository: AgentRepository,
		private readonly skillRefs: AgentSkillRefsService,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly chatIntegrations: ChatIntegrationRegistry,
		private readonly credentialsFinder: CredentialsFinderService,
	) {}

	async openForDraftRun(input: OpenSimulationInput): Promise<SimulationSession | undefined> {
		const key = sessionKey(input);
		// Such a world belongs to the connections of the draft, so each turn checks them again.
		const bound = this.registry.get()?.worldDependsOnDraftConnections === true;
		const cached = this.sessions.get(key);
		if (cached && !bound) {
			this.sessions.touch(key);
			// Keep the same session, so its cached runtime stays valid, but use the current tools.
			cached.session.updateCapabilities(
				await this.capabilitiesFor(await this.describeAgent(input.agentId, input.projectId)),
			);
			return cached.session;
		}
		// Overlapping turns of a new chat share one open, so the chat gets one world.
		const opening = this.opening.get(key);
		if (opening) {
			const shared = await opening;
			// The draft can change during the shared open, so this turn checks the binding itself.
			if (bound && shared) return await this.openForDraftRun(input);
			// A shared open that came back live never answers a caller that asked for a test run.
			if (shared || !input.testRunRequested) return shared;
			return await this.openForDraftRun(input);
		}
		const open = (cached ? this.reuseOrReplace(input, key, cached) : this.openNew(input)).finally(
			() => this.opening.delete(key),
		);
		this.opening.set(key, open);
		return await open;
	}

	/** Only for a backend whose world depends on the connections of the draft. */
	private async reuseOrReplace(
		input: OpenSimulationInput,
		key: string,
		cached: CachedSession,
	): Promise<SimulationSession | undefined> {
		// A session that stored the marker and finds it gone belongs to a thread that was removed.
		if (
			cached.marked &&
			!(await this.threadRepository.findTestChatState(input.testChatId))?.testChat
		) {
			this.dropSession(key, cached);
			return await this.openNew(input);
		}
		const described = await this.describeAgent(input.agentId, input.projectId);
		// Checked every turn: a credential the owner can no longer use changes the binding, so
		// the world that holds data copied through it is dropped.
		const binding = await this.bindingFor(described.config, input.user);
		if (binding.digest === cached.bindingDigest && this.sessions.touch(key)) {
			cached.session.updateCapabilities(
				await this.capabilitiesFor(withBindingGaps(described, binding)),
			);
			return cached.session;
		}
		// The old session leaves the cache, so a switch back to its connections opens a new world.
		this.dropSession(key, cached);
		// The thread keeps its marker, so the replacement still detects a removed thread.
		return await this.createSession(input, described, cached.marked, binding);
	}

	/**
	 * The saved MCP connections of the draft and, for each credential, whether the owner can
	 * still use it and its type. Only IDs and types are read, never a secret.
	 */
	private async bindingFor(config: AgentJsonConfig, owner: User): Promise<ConnectionBinding> {
		const servers = config.mcpServers ?? [];
		const credentialIds = [
			...new Set(
				servers
					.filter((server) => (server.authentication ?? 'none') !== 'none')
					.map((server) => server.credential)
					.filter((id): id is string => !!id && id !== AI_GATEWAY_MANAGED_TAG),
			),
		];
		// Stricter than seeing it: a see-only role cannot drive the credential's secret, so a
		// server whose credential the owner can only see stays out of the world.
		const states = new Map(
			await Promise.all(
				credentialIds.map(
					async (id) =>
						[
							id,
							await this.credentialsFinder.findCredentialForUser(id, owner, ['credential:read'], {
								excludeSeeOnlyRoles: true,
							}),
						] as const,
				),
			),
		);
		// Not `updatedAt`: a rename or an OAuth2 token refresh changes it, and would drop the world.
		const credentialState = (id: string | undefined) => {
			if (!id || !states.has(id)) return null;
			return states.get(id)?.type ?? 'unusable';
		};
		const unusableServers = new Set(
			servers
				.filter((server) => credentialState(server.credential) === 'unusable')
				.map((server) => server.name),
		);
		return { digest: bindingDigest(config, credentialState), unusableServers };
	}

	/** An expired entry is already gone and closed by `onExpire`, so it is not closed twice. */
	private dropSession(key: string, cached: CachedSession): void {
		if (this.sessions.delete(key)) void this.closeWorld(cached.session);
	}

	/** The worlds end with the process, so the backend can delete what they hold. */
	@OnShutdown()
	async shutdown(): Promise<void> {
		this.sessions.dispose();
		// The sweep closes the expired entries, so the loop closes only the live ones.
		this.sessions.sweep();
		const sessions = [...this.sessions].map(([, cached]) => cached.session);
		this.sessions.clear();
		await Promise.all(sessions.map(async (session) => await this.closeWorld(session)));
	}

	/** Lets the backend delete what a world holds. Never fails the turn. */
	private async closeWorld(session: SimulationSession): Promise<void> {
		const backend = this.registry.get();
		const { worldId } = session;
		if (!worldId || !backend?.closeWorld || backend.id !== session.backend) return;
		// `then` also catches a backend that throws before it returns a promise.
		const closeWorld = backend.closeWorld.bind(backend);
		await Promise.resolve()
			.then(async () => await closeWorld(worldId))
			.catch((error: unknown) => {
				this.logger.warn('[SafeTesting] Failed to close a simulated world', {
					worldId,
					error: error instanceof Error ? error.message : String(error),
				});
			});
	}

	private async openNew(input: OpenSimulationInput): Promise<SimulationSession | undefined> {
		// A test chat stays one, also with the flag off. A new chat is a test run only when asked for.
		const thread = await this.threadRepository.findTestChatState(input.testChatId);
		if (!thread?.testChat) {
			if (!input.testRunRequested) return undefined;
			// A message that asked for a test run must never run live, so it fails instead.
			if (!(await this.flagGate.isEnabled(input.user))) {
				throw new UserError('Test runs are not available, so this message did not run.');
			}
			// The mode is fixed when the chat starts, so a live chat never turns into a test chat.
			// A running execution is this turn: the message queue claims a preview message only
			// when no turn of the thread runs or waits, so an earlier live turn has finished.
			if (await this.executionRepository.hasFinishedByThread(input.testChatId)) {
				throw new UserError('This chat runs live. Start a new chat to run a test.');
			}
		}

		// After a restart or an expired cache, a test chat gets a new world.
		return await this.createSession(
			input,
			await this.describeAgent(input.agentId, input.projectId),
			thread?.testChat === true,
		);
	}

	private async createSession(
		input: OpenSimulationInput,
		describedAgent: DescribedAgent,
		/** True when the thread already holds the test chat marker. */
		marked = false,
		knownBinding?: ConnectionBinding,
	): Promise<SimulationSession> {
		const backend = this.registry.get();
		const binding = backend?.worldDependsOnDraftConnections
			? (knownBinding ?? (await this.bindingFor(describedAgent.config, input.user)))
			: undefined;
		const described = binding ? withBindingGaps(describedAgent, binding) : describedAgent;
		const capabilities = await this.capabilitiesFor(described);
		const { agent } = described;
		let world: SimulationWorld | undefined;
		let unavailableDetail: string | undefined;
		if (!backend) {
			unavailableDetail = 'No simulator is set up on this instance.';
		} else {
			try {
				world = await backend.openWorld({
					ownerId: input.user.id,
					testChatId: input.testChatId,
					// Tools n8n blocks (SSE MCP servers, custom code) stay out of the world too.
					agent: {
						...agent,
						tools: agent.tools.filter((tool) => !described.hostGaps.has(tool.toolName)),
					},
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
			// Runs before each turn's agent starts. Without the marker a later turn could run live.
			markTestChat: async () => {
				if (!(await this.threadRepository.markTestChat(input.testChatId))) {
					throw new UnexpectedError('Could not mark the test chat, so this test run cannot start.');
				}
				entry.marked = true;
			},
		});
		const entry: CachedSession = {
			session,
			// The binding stays in this process. The backend never receives it.
			...(binding ? { bindingDigest: binding.digest } : {}),
			marked,
		};
		this.sessions.set(sessionKey(input), entry);
		return session;
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
		// The runtime leaves disabled tools out, so the list does too.
		const enabledConfig = {
			...config,
			tools: config.tools?.filter((ref) => ref.enabled !== false),
		};
		for (const tool of summarizeTools(enabledConfig, saved.tools ?? {}, sanitizeToolName)) {
			const kind = tool.kind === 'other' && tool.name === 'web_search' ? 'web_search' : tool.kind;
			const server =
				kind === 'mcp' ? config.mcpServers?.find((entry) => entry.name === tool.name) : undefined;
			// An MCP server's URL can hold a key, so the simulator gets its name and origin only.
			const description = server ? (server.description ?? undefined) : tool.description;
			const origin = server ? urlOrigin(server.url) : undefined;
			tools.push({
				toolName: tool.name,
				kind,
				...(description ? { description } : {}),
				...(tool.nodeType ? { nodeType: tool.nodeType } : {}),
				...(origin ? { origin } : {}),
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
		for (const [toolName, gap] of await this.workflowRunGaps(enabledConfig, projectId)) {
			if (!hostGaps.has(toolName)) hostGaps.set(toolName, gap);
		}
		// Named as the runtime names them: `slack_context`, `slack_action`, `slack_2_action`,
		// plus the shared conversation tools (`do_not_respond`) the channels declare.
		const integrations = (saved.integrations ?? []).filter(isCredentialAgentIntegration);
		const descriptors = getIntegrationToolConnectionDescriptors(
			integrations,
			agentId,
			(integration) => ({
				conversationTools: this.chatIntegrations.get(integration.type)?.conversationTools,
			}),
		);
		const integrationToolNames = new Set<string>();
		for (const descriptor of descriptors) {
			integrationToolNames.add(descriptor.contextToolName);
			integrationToolNames.add(descriptor.actionToolName);
		}
		for (const descriptor of descriptors) {
			for (const toolName of descriptor.conversationTools ?? []) integrationToolNames.add(toolName);
		}
		for (const toolName of integrationToolNames) {
			tools.push({ toolName, kind: 'integration' });
			hostGaps.set(toolName, 'Chat integration tools cannot run in a test run yet.');
		}

		return {
			config,
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
	 * Workflow tools whose run would leave this main process, where the test run's hooks do not
	 * reach. The same rule refuses the run at call time. Legacy refs without an id are found by
	 * name, as the runtime finds them.
	 */
	private async workflowRunGaps(
		config: AgentJsonConfig,
		projectId: string,
	): Promise<Map<string, string>> {
		const gaps = new Map<string, string>();
		const refs = (config.tools ?? []).flatMap((ref) => (ref.type === 'workflow' ? [ref] : []));
		if (refs.length === 0) return gaps;
		const workflows = await findWorkflowToolWorkflows(this.workflowRepository, refs, projectId);
		for (const ref of refs) {
			const workflow = workflows.get(ref.workflowId ?? ref.workflow);
			// Draft runs start workflow tools in manual mode.
			const gap = workflow ? instrumentedRunGap(workflow, 'manual') : undefined;
			if (gap) gaps.set(sanitizeToolName(ref.name ?? ref.workflow), gap);
		}
		return gaps;
	}

	private hostGap(kind: SimulatedTool['kind'], mcpTransport?: string): string | undefined {
		switch (kind) {
			case 'custom':
				return 'Custom code tools can reach any service, so they cannot run in a test run yet.';
			case 'other':
				return 'This kind of tool cannot run in a test run yet.';
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
				served = new Map(described.map((tool) => [tool.toolName, tool]));
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
				reason: Extract<ToolTestCapability, { testability: 'blocked' }>['reason'],
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

interface ConnectionBinding {
	digest: string;
	/** MCP servers whose credential the owner can no longer use. They stay out of the world. */
	unusableServers: Set<string>;
}

/** Leaves the servers the owner can no longer use out of the world, with a reason. */
function withBindingGaps(described: DescribedAgent, binding: ConnectionBinding): DescribedAgent {
	if (binding.unusableServers.size === 0) return described;
	const hostGaps = new Map(described.hostGaps);
	for (const name of binding.unusableServers) {
		hostGaps.set(name, 'You can no longer use the credential of this MCP server.');
	}
	return { ...described, hostGaps };
}

interface CachedSession {
	session: SimulationSession;
	/** Set only for a backend whose world depends on the connections of the draft. */
	bindingDigest?: string;
	/** True after this session stored the test chat marker of its thread. */
	marked: boolean;
}

interface DescribedAgent {
	config: AgentJsonConfig;
	agent: SimulatedAgent;
	/** Tools that n8n blocks before any backend sees them, with the reason. */
	hostGaps: Map<string, string>;
}

/** A session belongs to one chat of one agent and user, so a reused chat ID never shares a world. */
function sessionKey({ user, projectId, agentId, testChatId }: OpenSimulationInput): string {
	return `${user.id}:${projectId}:${agentId}:${testChatId}`;
}

/**
 * Identifies the saved MCP server connections of a draft. It reads the credential reference
 * (an ID) and its state (its type, or `unusable`), never the credential. A URL can hold a key,
 * so only a digest is kept.
 */
function bindingDigest(
	config: AgentJsonConfig,
	credentialState: (id: string | undefined) => string | null,
): string {
	const connections = (config.mcpServers ?? [])
		.map((server) =>
			JSON.stringify([
				server.name,
				server.url,
				server.authentication ?? 'none',
				server.credential ?? null,
				credentialState(server.credential),
			]),
		)
		// The order of the servers in the draft does not change the connections.
		.sort();
	return createHash('sha256').update(JSON.stringify(connections)).digest('hex');
}

function urlOrigin(url: string): string | undefined {
	try {
		const { origin } = new URL(url);
		return origin === 'null' ? undefined : origin;
	} catch {
		return undefined;
	}
}
