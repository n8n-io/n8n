import { AgentEvent } from '@n8n/agents';
import type { AgentEventData, MemoryTaskUsageReport } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { SsrfProtectionService } from '@n8n/backend-network';
import { GlobalConfig, SsrfProtectionConfig, type InstanceAiConfig } from '@n8n/config';
import { type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import {
	createInstanceAgent,
	McpClientManager,
	tokenUsageToBuilderUsageItems,
	orchestratorAgentId,
	resolveAgentPreviewSession,
	type InstanceAiContext,
	type InstanceAiMemoryConfig,
	type McpServerConfig,
	type ModelConfig,
	type InstanceAiTraceContext,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { ErrorReporter } from 'n8n-core';

import { formatPreviewSessionContext } from '@/modules/agents/format-agent-session-context';
import { userHasScopes } from '@/permissions.ee/check-access';
import { Push } from '@/push';
import { Telemetry } from '@/telemetry';

import { canAccessAgentPreviewHandoff } from '../agent-preview-handoff';
import { getAgentContextService, isAgentsAccessEnabled } from '../agents-access';
import { InstanceAiAgentContextAdapterService } from '../instance-ai-agent-context.adapter';
import { InstanceAiCreditService } from '../instance-ai-credit.service';
import {
	getAgentErrorSeverity,
	InstanceAiErrorReporterService,
} from '../instance-ai-error-reporter.service';
import { InstanceAiModelService } from '../instance-ai-model.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiMcpRegistryService } from '../mcp';
import type { AssistantTurnEnvironment } from './assistant-turn-environment.factory';
import type { AssistantTurnRuntime, AssistantTurnState } from './assistant-turn-runtime';

/** The built orchestrator agent type returned by `createInstanceAgent`. */
export type InstanceAgent = Awaited<ReturnType<typeof createInstanceAgent>>['agent'];

/** What agent creation needs from the runtime that runs the turn. */
export type AssistantAgentRuntime = Pick<
	AssistantTurnRuntime,
	'eventBus' | 'checkpointStore' | 'onMemoryTaskEvent'
> & { turnState: Pick<AssistantTurnState, 'getObserverThresholdTokens'> };

export interface AssistantAgentParams {
	user: User;
	threadId: string;
	runId: string;
	tracing?: InstanceAiTraceContext;
	/**
	 * Lets the agent runtime title a thread that has none. The caller bills the
	 * title call from the run's side-call usage reports.
	 */
	generateTitle?: boolean;
}

/**
 * Creates the Assistant orchestrator agent for a turn from its execution
 * environment: Agent context readers, MCP servers, memory options and the
 * checkpoint store. Owns the MCP client connections that every turn shares.
 */
@Service()
export class AssistantAgentFactory {
	private _mcpClientManager?: McpClientManager;

	private readonly logger: Logger;

	private readonly instanceAiConfig: InstanceAiConfig;

	constructor(
		logger: Logger,
		globalConfig: GlobalConfig,
		private readonly ssrfProtectionConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly mcpRegistryService: InstanceAiMcpRegistryService,
		private readonly creditService: InstanceAiCreditService,
		private readonly instanceAiErrorReporter: InstanceAiErrorReporterService,
		private readonly errorReporter: ErrorReporter,
		private readonly telemetry: Telemetry,
		private readonly push: Push,
		private readonly modelService: InstanceAiModelService,
	) {
		this.logger = logger.scoped('instance-ai');
		this.instanceAiConfig = globalConfig.instanceAi;
	}

	private get mcpClientManager(): McpClientManager {
		if (!this._mcpClientManager) {
			this._mcpClientManager = new McpClientManager(
				this.ssrfProtectionConfig.enabled ? this.ssrfProtectionService : undefined,
				{ onToolCallSettled: (event) => this.trackMcpToolCall(event) },
			);
		}
		return this._mcpClientManager;
	}

	/** Closes the MCP client connections, if any were opened. */
	async disconnectMcpClients(): Promise<void> {
		await this._mcpClientManager?.disconnect();
	}

	async createAgent(
		environment: AssistantTurnEnvironment,
		runtime: AssistantAgentRuntime,
		params: AssistantAgentParams,
	): Promise<InstanceAgent> {
		const { user, threadId, runId, tracing, generateTitle } = params;
		if (tracing) {
			environment.orchestrationContext.tracing = tracing;
		}
		await this.bindAgentContextReader(environment.context, user);
		await this.bindAgentPreviewSession(environment.context, user);
		const mcpServers = await this.buildMcpServers(
			user,
			threadId,
			runId,
			tracing,
			environment.orchestrationContext.messageGroupId,
		);
		const { agent, mcpConnectionFailures } = await createInstanceAgent({
			modelId: environment.modelId,
			context: environment.context,
			orchestrationContext: environment.orchestrationContext,
			mcpServers,
			mcpManager: this.mcpClientManager,
			memoryConfig: this.createAgentMemoryOptions(
				user,
				threadId,
				runId,
				environment.memoryModelId,
				runtime.turnState.getObserverThresholdTokens(),
				generateTitle,
			),
			memory: environment.memory,
			checkpointStore: runtime.checkpointStore,
			onMemoryTaskEvent: runtime.onMemoryTaskEvent,
			thinkingEnabled: this.instanceAiConfig.thinkingEnabled,
			modelFetch: this.modelService.getModelFetch(),
		});
		// Surface MCP connection failures as a non-fatal status event. Publishing
		// here (rather than at each call site) covers the foreground run and both
		// resume paths (auto-setup rebuild + process-restart resume), so the user
		// is informed whenever a server is skipped — including after a resume.
		// Failures come from createInstanceAgent's result (threaded from the MCP
		// manager's getRegularTools call), not a shared manager field, so they
		// reflect this run's config and can't leak another run's server names.
		if (mcpConnectionFailures.length > 0) {
			const names = mcpConnectionFailures.map((f) => f.server).join(', ');
			for (const failure of mcpConnectionFailures) {
				this.errorReporter.error(
					new Error(`MCP server "${failure.server}" failed to connect: ${failure.error}`),
					{
						level: 'warning',
						tags: { component: 'instance-ai-mcp', server: failure.server },
						extra: { runId, threadId, server: failure.server, error: failure.error },
						shouldIsolate: true,
					},
				);
			}
			runtime.eventBus.publish(threadId, {
				type: 'status',
				runId,
				agentId: orchestratorAgentId(runId),
				payload: {
					message: `Couldn't reach MCP server${mcpConnectionFailures.length > 1 ? 's' : ''} ${names}; continuing without their tools.`,
				},
			});
		}
		this.subscribeToAgentErrors(agent, threadId, runId);
		return agent;
	}

	/** Wire project-scoped, read-only Agent context for the current user. */
	private async bindAgentContextReader(context: InstanceAiContext, user: User): Promise<void> {
		const projectId = context.projectId;
		if (!projectId) return;
		if (!(await userHasScopes(user, ['agent:read'], false, { projectId }))) return;

		if (!isAgentsAccessEnabled()) return;
		context.agentContextService = Container.get(InstanceAiAgentContextAdapterService).createReader(
			user,
			projectId,
		);
	}

	/**
	 * Hydrate the thread-persisted preview-session reference (if any) and wire
	 * the on-demand transcript resolver. Must run before createInstanceAgent so
	 * createOrchestrationTools can register get-session on follow-up turns.
	 */
	private async bindAgentPreviewSession(context: InstanceAiContext, user: User): Promise<void> {
		await resolveAgentPreviewSession(context);
		const projectId = context.projectId;
		if (!context.agentPreviewSession || !projectId) return;
		if (!isAgentsAccessEnabled()) {
			context.agentPreviewSession = undefined;
			return;
		}
		if (!(await canAccessAgentPreviewHandoff(user, projectId))) {
			context.agentPreviewSession = undefined;
			return;
		}

		context.resolvePreviewSession = async (ref) => {
			const service = getAgentContextService();
			if (!service) return null;
			const detail = await service.readSession(user, projectId, ref.agentId, ref.threadId);
			if (!detail) return null;
			const transcript = formatPreviewSessionContext(
				detail.thread,
				detail.executions,
				ref.executionId,
			);
			if (transcript === null) return null;
			return {
				title: detail.thread.title?.trim() || `Session #${detail.thread.sessionNumber}`,
				sessionNumber: detail.thread.sessionNumber,
				transcript,
			};
		};
	}

	private async buildMcpServers(
		user: User,
		threadId: string,
		runId: string,
		tracing: InstanceAiTraceContext | undefined,
		messageGroupId?: string,
	): Promise<McpServerConfig[]> {
		const staticMcpServers = this.parseMcpServers(this.instanceAiConfig.mcpServers);
		const registryMcpServers = this.settingsService.isMcpAccessEnabled()
			? await this.instanceAiErrorReporter.withBoundary(
					'instance-ai-mcp-setup',
					{
						threadId,
						runId,
						tracing,
						agentId: orchestratorAgentId(runId),
						userId: user.id,
						messageGroupId,
					},
					async () => await this.mcpRegistryService.getRegistryMcpServers(user),
				)
			: [];
		return [...staticMcpServers, ...registryMcpServers];
	}

	private parseMcpServers(raw: string): McpServerConfig[] {
		if (!raw.trim()) return [];

		return raw.split(',').map((entry) => {
			const [name, url] = entry.trim().split('=');
			return { name: name.trim(), url: url?.trim() };
		});
	}

	private createAgentMemoryOptions(
		user: User,
		threadId: string,
		runId: string,
		memoryModelId: ModelConfig | undefined,
		observerThresholdTokens: number | undefined,
		generateTitle = false,
	): InstanceAiMemoryConfig {
		return {
			// Titles run on the memory model, like the observer and the reflector.
			...(generateTitle
				? {
						titleGeneration: {
							...(memoryModelId ? { model: memoryModelId } : {}),
							// The host copies the title to the thread list when the run ends, so the
							// title must be saved by then to show after the first turn.
							sync: true,
						},
					}
				: {}),
			observationalMemory: {
				model: memoryModelId,
				observerThresholdTokens:
					observerThresholdTokens ?? this.instanceAiConfig.observerMessageTokens,
				reflectorThresholdTokens: this.instanceAiConfig.reflectorObservationTokens,
				midRunObservation: this.instanceAiConfig.midRunObservation,
				// Observer/reflector calls run in the background outside the run's
				// finish-chunk usage, so they are claimed here per report. Best-effort:
				// a billing failure must never block observation persistence.
				onTaskUsage: async (report: MemoryTaskUsageReport) => {
					try {
						const items = tokenUsageToBuilderUsageItems(report.model, report.usage);
						if (items.length === 0) return;
						await this.creditService.claimRunUsage(
							user,
							threadId,
							`${runId}:memory:${report.task}:${report.reportId}`,
							items,
							'completed',
						);
					} catch (error) {
						this.logger.warn('Failed to claim observational-memory usage', {
							threadId,
							runId,
							task: report.task,
							error: getErrorMessage(error),
						});
					}
				},
			},
		};
	}

	/**
	 * Surface the agent's background/best-effort failures to Sentry. The SDK emits
	 * `AgentEvent.Error` for these but nothing consumed it, so they were lost: memory
	 * observer/reflector/episodic indexing and the eager input / turn-on-suspend
	 * persists all fail silently. Optional memory processing is warning-level;
	 * persistence stays error-level because it can lose turn data. We report only
	 * the `source`-tagged events — the main agentic-loop errors (no source) already
	 * reach Sentry via the errored run/stream result.
	 */
	private subscribeToAgentErrors(agent: InstanceAgent, threadId: string, runId: string): void {
		agent.on(AgentEvent.Error, (event: AgentEventData) => {
			if (event.type !== AgentEvent.Error) return;
			if (!event.source) return;
			const severity = getAgentErrorSeverity(event.source);
			this.instanceAiErrorReporter.report(event.error, {
				component: `instance-ai-${event.source}`,
				...(severity ? { severity } : {}),
				threadId,
				runId,
			});
		});
	}

	private trackMcpToolCall({
		server,
		toolName,
		success,
	}: {
		server: McpServerConfig;
		toolName: string;
		success: boolean;
	}): void {
		const serverSlug = server.metadata?.serverSlug;
		const userId = server.metadata?.userId;
		const connectionId = server.metadata?.connectionId;
		if (serverSlug && userId) {
			this.telemetry.track('Instance AI mcp tool called', {
				user_id: userId,
				server_slug: serverSlug,
				tool_name: toolName,
				success,
			});
		}

		if (!success && connectionId && userId) {
			this.push.sendToUsers({ type: 'instanceAiMcpToolCallFailed', data: { connectionId } }, [
				userId,
			]);
		}
	}
}
