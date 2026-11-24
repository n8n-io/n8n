import type { AgentMessage, JSONObject, SideCallUsageReport, TokenUsage } from '@n8n/agents';
import {
	ASSISTANT_WORKFLOWS_ARCHIVED_EVENT,
	InstanceAiConfirmRequestDto,
	type InstanceAiAgentAttachment,
	type InstanceAiApprovalMode,
	type InstanceAiAttachment,
	type InstanceAiElementAttachment,
	type InstanceAiNodesAttachment,
	type InstanceAiResourceAttachment,
	type InstanceAiThreadSubject,
	type InstanceAiWorkflowAttachment,
	isAttachmentMediaTypeSupported,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig, type AiConfig } from '@n8n/config';
import { UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import {
	MAX_STEPS,
	modelConfigId,
	orchestratorAgentId,
	patchThread,
	snapshotAgent,
	tokenUsageToBuilderUsageItems,
	withThreadSubject,
	type InstanceAiWorkflowService,
	type ModelConfig,
} from '@n8n/instance-ai';
import { buildResumeData, toConfirmationData } from '@n8n/instance-ai/confirmation-payload';
import { hasGlobalScope } from '@n8n/permissions';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { nanoid } from 'nanoid';

import type {
	SystemAgentAfterThreadDeletion,
	SystemAgentProvider,
	SystemAgentStartTurn,
	SystemAgentThreadDeletionScope,
	SystemAgentTurn,
	SystemAgentTurnHandle,
	SystemAgentTurnOptions,
	SystemAgentTurnOutcome,
	SystemAgentUserStopScope,
} from '@/modules/agents/system-agents/system-agent.types';
import { TelemetryProxy } from '@n8n/backend-services';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { modelStreamStallOptions } from '@/utils/model-stream-stall-options';

import {
	readAssistantConfirmationPayload,
	trackBuilderAskedForInput,
} from '../builder-input-telemetry';
import { InstanceAiCreditService } from '../instance-ai-credit.service';
import { InstanceAiErrorReporterService } from '../instance-ai-error-reporter.service';
import { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { extractEditorContextResourceAttachments } from '../internal-messages';
import { extractTextFromContent } from '../message-parser';
import {
	getUserFacingErrorCode,
	getUserFacingErrorMessage,
	isAttachmentRejectedByProviderError,
	isMaskedStreamFailure,
} from '../user-facing-errors';
import { AssistantAgentFactory } from '../turn-setup/assistant-agent.factory';
import {
	AssistantTurnEnvironmentFactory,
	type AssistantProxyRunConfig,
	type AssistantTurnEnvironment,
} from '../turn-setup/assistant-turn-environment.factory';
import {
	AssistantTurnInputBuilder,
	type AssistantTurnInput,
} from '../turn-setup/assistant-turn-input.builder';
import type { TemporaryWorkflowMarkers } from '../temporary-workflow-markers';
import { AssistantTurnOverrides } from '../turn-setup/assistant-turn-overrides';
import type {
	AssistantTurnRuntime,
	AssistantTurnState,
} from '../turn-setup/assistant-turn-runtime';
import {
	AssistantContextTurnTelemetry,
	readSuspendedContextTurn,
	writeSuspendedContextTurn,
} from './assistant-context-turn-telemetry';
import { AssistantEventSink } from './assistant-event-sink';
import {
	createSnapshotTemporaryWorkflowMarkers,
	createThreadTemporaryWorkflowMarkers,
} from './assistant-temporary-workflow-markers';
import { AssistantThreadTabsService } from './assistant-thread-tabs.service';
import { AssistantTurnTracer, type AssistantTurnTrace } from './assistant-turn-trace';
import {
	ASSISTANT_AGENT_ID,
	ASSISTANT_AGENT_NAME,
	ASSISTANT_TURN_METADATA_KEY,
	createAssistantTurnOptions,
	readAssistantTurnOptions,
	serializeAssistantTurnOptions,
	type AssistantTurnOptions,
} from './assistant-turn-options';
import { AssistantWorkflowSetupRoute } from './assistant-workflow-setup-route';
import {
	AssistantSandboxWorkspaceSource,
	type AssistantSandboxLease,
} from './assistant-workspace-source';

/** The model input of a message that has files but no text. */
export const FILES_ONLY_MESSAGE =
	'The user attached file(s) without a message. Inspect the first file and give a short summary. Use parse-file for a file that you cannot read directly.';

type FormattedTurnError = NonNullable<
	Awaited<ReturnType<NonNullable<SystemAgentTurnHandle['formatError']>>>
>;

/** The resource attachments that reach the agent. Node attachments need their gate. */
function contextAttachmentsOf(
	attachments: InstanceAiAttachment[] | undefined,
	nodeContextEnabled: boolean,
): InstanceAiResourceAttachment[] {
	return (attachments ?? []).filter(
		(
			attachment,
		): attachment is
			| InstanceAiWorkflowAttachment
			| InstanceAiAgentAttachment
			| InstanceAiNodesAttachment
			| InstanceAiElementAttachment =>
			attachment.type === 'workflow' ||
			attachment.type === 'agent' ||
			attachment.type === 'element' ||
			(attachment.type === 'nodes' && nodeContextEnabled),
	);
}

/**
 * The request ids of the cards that a resumed run still shows. Each tool
 * suspension creates a new request id, so a card with one of these ids is a
 * copy that the resume sends again.
 */
function openRequestIdsOf(turn: SystemAgentTurn<AssistantSandboxLease>): Set<string> {
	if (turn.type !== 'resume') return new Set();
	return new Set(
		turn.openSuspensions.flatMap(
			({ suspendPayload }) => readAssistantConfirmationPayload(suspendPayload)?.requestId ?? [],
		),
	);
}

/**
 * The n8n Assistant as a system agent on the Agents runtime. The runtime owns
 * the queue, steering, checkpoints, HITL resume and the chat stream. The
 * provider builds each turn with the shared Assistant turn setup.
 */
@Service()
export class AssistantAgentProvider implements SystemAgentProvider<AssistantSandboxLease> {
	readonly agentId = ASSISTANT_AGENT_ID;

	readonly name = ASSISTANT_AGENT_NAME;

	private readonly logger: Logger;

	private readonly aiConfig: AiConfig;

	constructor(
		logger: Logger,
		globalConfig: GlobalConfig,
		readonly workspace: AssistantSandboxWorkspaceSource,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly creditService: InstanceAiCreditService,
		private readonly turnEnvironment: AssistantTurnEnvironmentFactory,
		private readonly turnInput: AssistantTurnInputBuilder,
		private readonly agentFactory: AssistantAgentFactory,
		private readonly tracer: AssistantTurnTracer,
		private readonly threadTabs: AssistantThreadTabsService,
		private readonly errorReporter: InstanceAiErrorReporterService,
		private readonly userRepository: UserRepository,
		private readonly turnOverrides: AssistantTurnOverrides,
		private readonly telemetry: TelemetryProxy,
	) {
		this.logger = logger.scoped('instance-ai');
		this.aiConfig = globalConfig.ai;
	}

	/** The runtime already requires `project:read` on the working project. */
	async authorize(user: User): Promise<boolean> {
		return hasGlobalScope(user, 'instanceAi:message') && this.settingsService.isAgentEnabled();
	}

	async chatTurnOptions(
		_user: User,
		_thread: SystemAgentTurn['thread'],
		clientContext?: Record<string, unknown>,
	): Promise<SystemAgentTurnOptions> {
		return serializeAssistantTurnOptions(createAssistantTurnOptions(clientContext, this.logger));
	}

	/**
	 * Cards send the confirmation body of the Assistant chat, and tools expect their
	 * resume data. Other bodies pass through unchanged, such as the cancellation that
	 * the chat sends when the user types while a card waits.
	 */
	normalizeResumeData(resumeData: unknown): unknown {
		const parsed = InstanceAiConfirmRequestDto.safeParse(resumeData);
		return parsed.success ? buildResumeData(toConfirmationData(parsed.data)) : resumeData;
	}

	/**
	 * The model input of a user turn keeps its resource attachments, such as
	 * mentions, in the thread context block. Read them back like the current
	 * runtime does, so the chat shows them again after a reload.
	 */
	readMessageReferences(modelInput: AgentMessage): InstanceAiResourceAttachment[] {
		const content = 'content' in modelInput ? modelInput.content : undefined;
		return extractEditorContextResourceAttachments(extractTextFromContent(content));
	}

	/**
	 * A suspended turn does not archive the temporary workflows of the thread,
	 * so a thread deleted during the wait still marks them. The markers are in
	 * the thread metadata, which the deletion removes: read them first, and
	 * archive the workflows after the deletion commits.
	 */
	async onBeforeThreadDeletion({
		threadId,
		userId,
		memory,
	}: SystemAgentThreadDeletionScope): Promise<SystemAgentAfterThreadDeletion | undefined> {
		const workflowIds = await createThreadTemporaryWorkflowMarkers(memory, threadId).list();
		if (workflowIds.length === 0) return undefined;
		return async () => {
			const user = await this.userRepository.findByIdWithRole(userId);
			if (!user) return;
			const markers = createSnapshotTemporaryWorkflowMarkers(workflowIds);
			const { workflowService } = this.adapterService.createContext(user, {
				threadId,
				temporaryWorkflowMarkers: markers,
			});
			await this.archiveTemporaryWorkflows(workflowService, markers, threadId);
		};
	}

	/** The runtime calls this only for a stop that took effect. */
	onUserStoppedTurn({ threadId, userId }: SystemAgentUserStopScope): void {
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_STOPPED_RUN, {
			user_id: userId,
			thread_id: threadId,
			runtime: 'agents',
		});
	}

	/** A setup failure, such as the credit check before the run, gets the turn's error text. */
	async formatSetupError(user: User, error: unknown): Promise<FormattedTurnError> {
		return toFormattedTurnError(await this.resolveShownError(user, error));
	}

	async prepareTurn(turn: SystemAgentTurn<AssistantSandboxLease>): Promise<SystemAgentTurnHandle> {
		const options = readAssistantTurnOptions(
			turn.type === 'start'
				? turn.options
				: turn.checkpointHostMetadata[ASSISTANT_TURN_METADATA_KEY],
			this.logger,
		);
		const { user } = turn;
		const { request } = options;
		// Reports one Sentry event for each error of the turn. `onSettled` ends it.
		const errorReporting = this.errorReporter.beginRun(options.runId);
		let trace: AssistantTurnTrace | undefined;
		try {
			const experimentGates = await this.adapterService.resolveExperimentGates(user);
			const turnFiles = turn.type === 'start' ? turn.attachments : [];
			const contextAttachments = contextAttachmentsOf(
				request.attachments,
				experimentGates.nodeContextEnabled,
			);
			// One token manager backs the run and its trace.
			const proxyRunConfig = await this.turnEnvironment.createProxyRunConfig(user);
			trace = await this.tracer.startForTurn(turn, {
				runId: options.runId,
				messageGroupId: options.messageGroupId,
				...(proxyRunConfig.tracingProxyConfig
					? { proxyConfig: proxyRunConfig.tracingProxyConfig }
					: {}),
				fileAttachments: turnFiles,
				contextAttachments,
				threadArtifacts: request.threadArtifacts,
			});
			return await this.prepareTracedTurn(turn, options, {
				trace,
				errorReporting,
				experimentGates,
				contextAttachments,
				proxyRunConfig,
			});
		} catch (error) {
			const aborted = turn.abortSignal.aborted;
			if (!aborted) {
				this.reportTurnError(error, 'instance-ai-run', turn, options, trace);
			}
			this.errorReporter.endRun(options.runId, errorReporting);
			await trace?.finish({ status: aborted ? 'cancelled' : 'errored', error });
			throw error;
		}
	}

	private async prepareTracedTurn(
		turn: SystemAgentTurn<AssistantSandboxLease>,
		options: AssistantTurnOptions,
		setup: {
			trace: AssistantTurnTrace | undefined;
			errorReporting: symbol;
			experimentGates: Awaited<ReturnType<InstanceAiAdapterService['resolveExperimentGates']>>;
			contextAttachments: InstanceAiResourceAttachment[];
			proxyRunConfig: AssistantProxyRunConfig;
		},
	): Promise<SystemAgentTurnHandle> {
		const { user, thread } = turn;
		const { runId, request } = options;
		const { trace, errorReporting, experimentGates, contextAttachments, proxyRunConfig } = setup;
		const setupRoute = new AssistantWorkflowSetupRoute(turn.memory, thread.id, this.logger, {
			setupPanelEnabled: experimentGates.setupPanelEnabled,
		});
		const runtime = this.createTurnRuntime(turn, options, trace, setupRoute);
		const environment = await this.turnEnvironment.create(
			{
				user,
				threadId: thread.id,
				runId,
				abortSignal: turn.abortSignal,
				messageGroupId: options.messageGroupId,
				pushRef: request.pushRef,
				proxyRunConfig,
				experimentGates,
				...(trace ? { tracing: trace.context } : {}),
				// Whether the turn can build or edit an agent. Auto approval is not part of the Agent
				// Builder, so such a turn keeps every approval card. The subject is bound after this,
				// so the first turn of an agent thread counts it here. An attached or mentioned agent
				// does not bind the thread, but this turn can still edit it, so the turn stays manual.
				// Later turns that do not attach it use the approval mode of the user.
				attachesAgent:
					request.subject?.type === 'agent' ||
					request.attachments?.some((attachment) => attachment.type === 'agent'),
			},
			runtime,
		);
		this.turnInput.applyTurnScope(environment, {
			threadId: thread.id,
			runId,
			message: turn.type === 'start' ? turn.message : '',
			timeZone: request.timeZone,
			// The runtime adds the files to the model input as stored references,
			// and parse-file reads them by id through `storedFiles`.
			fileAttachments: [],
		});
		// The turn has the sandbox files of project agents only when their flag is on.
		const { sandboxFiles } = turn;
		// Set when the agent is built, before any tool runs. The tools are built
		// with the agent, so `canView` must exist before then.
		const model: { provider?: string } = {};
		environment.context.storedFiles = {
			read: async (fileId) => await turn.readFile(fileId),
			// The files list of the chat has the same flag.
			...(sandboxFiles ? { list: async () => await sandboxFiles.listFiles() } : {}),
			// The same check as the file store, which loads only these types for the model.
			canView: (mimeType) => isAttachmentMediaTypeSupported(model.provider, mimeType),
		};
		if (sandboxFiles) {
			const { context } = environment;
			// Read the sandbox when a tool runs: it belongs to the turn, not to this setup.
			const workspaceOf = () => {
				if (!context.workspace) throw new UserError('This conversation has no sandbox');
				return context.workspace;
			};
			context.sandboxFiles = {
				maxImportBytes: sandboxFiles.maxImportBytes,
				importFiles: async (files, abortSignal) =>
					await sandboxFiles.importFiles(workspaceOf(), files, abortSignal),
				storeOutput: async (path, abortSignal) =>
					await sandboxFiles.storeOutput(workspaceOf(), path, abortSignal),
			};
		}
		const contextTurn = await this.createContextTurnTelemetry(turn, runId);
		contextTurn.bind(environment.orchestrationContext.skills);

		let turnInput: AssistantTurnInput | undefined;
		if (turn.type === 'start') {
			// Only the subject binds. An attached or mentioned agent is a reference for the turn.
			await this.bindThreadSubject(turn, request.subject);
			const buildInput = async () =>
				await this.turnInput.buildInput(environment, runtime, {
					user,
					threadId: thread.id,
					runId,
					message:
						!turn.message.trim() && turn.attachments.length > 0 ? FILES_ONLY_MESSAGE : turn.message,
					fileAttachments: [],
					contextAttachments,
					handoffContext: request.context,
					timeZone: request.timeZone,
					threadArtifacts: request.threadArtifacts,
					titledByRuntime: true,
					onInstanceContextInjection: (injection) =>
						contextTurn.setContext({
							injection,
							instanceContextEnabled: environment.instanceContextEnabled,
							nodeUsageEnabled: environment.nodeUsageEnabled,
						}),
				});
			turnInput = trace
				? await trace.tracePromptBuild(
						{ message: turn.message, attachmentCount: turn.attachments.length },
						buildInput,
						(built) => ({ fullMessage: built.fullMessage }),
					)
				: await buildInput();
		}

		await trace?.startOrchestratorRun();
		const agent = await this.agentFactory.createAgent(environment, runtime, {
			user,
			threadId: thread.id,
			runId,
			generateTitle: true,
			...(trace ? { tracing: trace.context } : {}),
		});
		model.provider = agent.snapshot.model.provider ?? undefined;
		if (turn.type === 'start') await this.snapshotAttachedAgents(environment, contextAttachments);

		let usage: { model: string; usage: TokenUsage } | undefined;
		let inputAccepted: Promise<void> | undefined;
		// A resume sends the still-open cards again, so only the cards that are new count as asks.
		const askedRequestIds = openRequestIdsOf(turn);
		// The model stream reports these errors. Other errors of the turn were thrown.
		const streamErrors = new Set<unknown>();
		// `formatError` and the turn report share the credit check of one error.
		const shownErrors = new Map<unknown, Promise<unknown>>();
		const shownErrorOf = async (error: unknown) => {
			let shown = shownErrors.get(error);
			if (!shown) {
				shown = this.resolveShownError(user, error);
				shownErrors.set(error, shown);
			}
			return await shown;
		};
		return {
			agent,
			// The runtime adds the files to the model input as stored references, so the
			// input keeps only the text. parse-file reads the files by id when it needs them.
			...(turnInput ? { input: turnInput.fullMessage } : {}),
			hostMetadata: this.hostMetadataOf(
				options,
				this.turnOverrides.getPromptVersion(thread.id),
				trace,
			),
			runOptions: {
				maxIterations: MAX_STEPS.ORCHESTRATOR,
				// Recover token usage from raw provider events, so a stopped run is still billed.
				recoverUsageOnAbort: true,
				...modelStreamStallOptions(this.aiConfig),
				providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
				// The input carries context blocks before the user's words, so title the words only.
				...(turn.type === 'start' ? { titleText: turn.message } : {}),
			},
			...(trace
				? { withTurnContext: async <T>(run: () => Promise<T>) => await trace.withContext(run) }
				: {}),
			// Routes a build to setup when the agent ends the turn without it.
			onCompletingBoundary: async () => {
				const instruction = await setupRoute.nextInstruction();
				if (instruction) trace?.recordHostInstruction(instruction);
				return instruction;
			},
			onChunk: (chunk) => {
				trace?.observeChunk(chunk);
				contextTurn.observeChunk(chunk);
				if (chunk.type === 'error') streamErrors.add(chunk.error);
				if (chunk.type === 'tool-call-suspended') {
					setupRoute.observeSuspension(chunk.toolName, chunk.suspendPayload);
					this.trackAskedForInput(
						user.id,
						thread.id,
						chunk,
						askedRequestIds,
						environment.context.approvalMode,
					);
				}
				// The SDK stores the input when it receives it, so the first chunk means it is accepted.
				if (!inputAccepted && turnInput) {
					inputAccepted = this.turnInput
						.onInputAccepted(environment, runtime, turnInput, { user, threadId: thread.id, runId })
						.catch((error: unknown) => {
							this.logger.warn('Failed to record the accepted Assistant turn input', {
								threadId: thread.id,
								error: getErrorMessage(error),
							});
						});
				}
				if (chunk.type === 'finish' && chunk.usage) {
					usage = {
						model: chunk.model ?? modelLabel(environment.modelId),
						usage: chunk.usage,
					};
				}
			},
			onSettled: async (outcome) => {
				try {
					// Finish before the host events close and the next queued turn reads the cursor.
					await inputAccepted;
					await this.claimTurnUsage(user, thread.id, runId, outcome, usage);
					await this.settleContextTurn(turn, runId, outcome, contextTurn, usage?.usage);
					// Before the card resumes, so that the resumed turn does not route setup again.
					await setupRoute.markSuspendedSetupsRouted();
					// A suspended turn can still be building the workflows it marked.
					if (outcome.status !== 'suspended') {
						const archived = await this.archiveTemporaryWorkflows(
							environment.context.workflowService,
							runtime.temporaryWorkflowMarkers,
							thread.id,
						);
						this.emitArchivedWorkflows(turn, thread.id, archived);
					}
				} finally {
					if (outcome.status === 'errored') {
						const component = streamErrors.has(outcome.error)
							? 'instance-ai-stream'
							: 'instance-ai-run';
						this.reportTurnError(
							await shownErrorOf(outcome.error),
							component,
							turn,
							options,
							trace,
						);
					}
					await trace?.finish(outcome, environment.modelId);
					this.errorReporter.endRun(runId, errorReporting);
				}
			},
			onSideCallUsage: async (report) =>
				await this.claimSideCallUsage(user, thread.id, runId, report),
			formatError: async (error) => toFormattedTurnError(await shownErrorOf(error)),
		};
	}

	/** A resume continues the Hub skill use and the instance context of its suspended segment. */
	private async createContextTurnTelemetry(
		turn: SystemAgentTurn<AssistantSandboxLease>,
		runId: string,
	): Promise<AssistantContextTurnTelemetry> {
		const scope = { userId: turn.user.id, threadId: turn.thread.id, runId };
		if (turn.type === 'start') {
			return new AssistantContextTurnTelemetry(this.telemetry, { ...scope, resumed: false });
		}
		let saved: Awaited<ReturnType<typeof readSuspendedContextTurn>>;
		try {
			saved = await readSuspendedContextTurn(turn.memory, turn.thread.id, runId);
		} catch (error) {
			this.logger.warn('Failed to read the instance context of a suspended Assistant turn', {
				threadId: turn.thread.id,
				runId,
				error: getErrorMessage(error),
			});
		}
		return new AssistantContextTurnTelemetry(
			this.telemetry,
			{
				...scope,
				resumed: true,
				openToolCallIds: new Set(turn.openSuspensions.map(({ toolCallId }) => toolCallId)),
			},
			saved,
		);
	}

	/**
	 * Reports the segment. A suspended turn keeps its instance context for the
	 * resume, and a resumed turn that ends drops it. Best effort.
	 */
	private async settleContextTurn(
		turn: SystemAgentTurn<AssistantSandboxLease>,
		runId: string,
		outcome: SystemAgentTurnOutcome,
		contextTurn: AssistantContextTurnTelemetry,
		usage: TokenUsage | undefined,
	): Promise<void> {
		try {
			// Report first: the report counts a Hub skill snapshot, and the saved state keeps the count.
			contextTurn.report(outcome.status, usage);
			const context = outcome.status === 'suspended' ? contextTurn.save() : undefined;
			// Only a resume can end a run that stored a context.
			if (!context && turn.type === 'start') return;
			await writeSuspendedContextTurn(turn.memory, turn.thread.id, runId, context);
		} catch (error) {
			this.logger.warn('Failed to store the instance context of an Assistant turn', {
				threadId: turn.thread.id,
				runId,
				error: getErrorMessage(error),
			});
		}
	}

	/** Sends "Builder asked for input" once for each new Assistant card. */
	private trackAskedForInput(
		userId: string,
		threadId: string,
		{
			toolCallId,
			toolName,
			suspendPayload,
		}: { toolCallId: string; toolName: string; suspendPayload?: unknown },
		askedRequestIds: Set<string>,
		approvalMode: InstanceAiApprovalMode | undefined,
	): void {
		const payload = readAssistantConfirmationPayload(suspendPayload);
		if (!payload || askedRequestIds.has(payload.requestId)) return;
		askedRequestIds.add(payload.requestId);
		trackBuilderAskedForInput(this.telemetry, {
			userId,
			threadId,
			inputThreadId: payload.requestId,
			// The tool call joins the card with the Auto decision of the same call.
			payload: { ...payload, toolCallId, toolName },
			runtime: 'agents',
			approvalMode,
		});
	}

	/** Binds the Agents runtime state of one turn for the shared turn setup. */
	private createTurnRuntime(
		turn: SystemAgentTurn<AssistantSandboxLease>,
		options: AssistantTurnOptions,
		trace: AssistantTurnTrace | undefined,
		setupRoute: AssistantWorkflowSetupRoute,
	): AssistantTurnRuntime {
		const lease = turn.workspace;
		return {
			memory: turn.memory,
			resourceId: turn.resourceId,
			temporaryWorkflowMarkers: createThreadTemporaryWorkflowMarkers(turn.memory, turn.thread.id),
			getProjectId: async () => turn.thread.projectId,
			eventBus: new AssistantEventSink(
				turn,
				this.logger,
				trace ? (event) => trace.observeEvent(event) : undefined,
			),
			// Keeps the trace open until the observer and reflector of the turn finish.
			...(trace?.context.onMemoryTaskEvent
				? { onMemoryTaskEvent: trace.context.onMemoryTaskEvent }
				: {}),
			checkpointStore: turn.checkpointStore,
			turnState: this.createTurnState(turn.thread.id, options),
			sessionGrants: turn.sessionGrants,
			onDomainAccessTracker: () => {},
			// The chat shows the tab of a changed artifact only while a browser shows the
			// turn. Storing it here also covers a closed browser tab.
			onArtifactChanged: async (artifact) => {
				try {
					await this.threadTabs.showArtifactTab(turn.memory, turn.thread.id, artifact);
				} catch (error) {
					this.logger.warn('Failed to show an Assistant artifact tab', {
						threadId: turn.thread.id,
						error: getErrorMessage(error),
					});
				}
			},
			readSetupItemsSnapshots: async () => [],
			// The setup panel announces the checklist without suspending the turn.
			markWorkflowSetupHandled: async (workflowId) =>
				await setupRoute.markWorkflowSetupHandled(workflowId),
			sandbox: {
				resolveConfig: async () =>
					lease?.config ?? {
						enabled: false,
						provider: this.settingsService.getSandboxStatus().provider,
					},
				getOrCreateWorkspace: async (context) =>
					lease ? await this.workspace.getWorkspace(lease, context) : undefined,
			},
		};
	}

	/** The turn overrides supply the prompt version. The client request supplies only the Browser Use report. */
	private createTurnState(threadId: string, options: AssistantTurnOptions): AssistantTurnState {
		const overrides = this.turnOverrides;
		return {
			getPromptVersion: () => overrides.getPromptVersion(threadId),
			setPromptConfiguration: () => {},
			setSetupPanelEnabled: () => {},
			getBrowserUseAvailable: () => options.request.browserUseAvailable,
			// The Assistant agent has no threshold override. Memory uses the configured policy.
			getObserverThresholdTokens: () => undefined,
		};
	}

	/**
	 * Binds the resource that the thread starts on, like the editor binds a thread
	 * on the current runtime before its first message. The tools then work on that
	 * resource, and its page finds the thread by the binding.
	 */
	private async bindThreadSubject(
		turn: SystemAgentStartTurn<AssistantSandboxLease>,
		subject: InstanceAiThreadSubject | undefined,
	): Promise<void> {
		// The tools act only in the project of the thread.
		if (subject?.projectId !== turn.thread.projectId) return;
		await this.updateThreadMetadata(turn, (metadata) => withThreadSubject(metadata, subject));
	}

	/** Applies `update` to the thread metadata. `update` returns `undefined` to change nothing. */
	private async updateThreadMetadata(
		turn: SystemAgentStartTurn<AssistantSandboxLease>,
		update: (metadata: Record<string, unknown>) => Record<string, unknown> | undefined,
	): Promise<void> {
		// A patch replaces the metadata, so binding a saved agent drops its pending marker.
		// `saveThread` merges, and a leftover marker makes a later build adopt this agent.
		const patched = await patchThread(turn.memory, {
			threadId: turn.thread.id,
			update: ({ metadata }) => {
				const next = update(metadata ?? {});
				return next ? { metadata: next } : null;
			},
		});
		if (patched) return;
		// The first turn saves its messages after this, so the thread row can be missing here.
		const metadata = update({});
		if (!metadata) return;
		await turn.memory.saveThread({ id: turn.thread.id, resourceId: turn.resourceId, metadata });
	}

	/** Records each attached agent as the turn opens on it. The builder never sees a
	 *  turn that only asks about the agent, so nothing else records this state. */
	private async snapshotAttachedAgents(
		environment: AssistantTurnEnvironment,
		attachments: InstanceAiResourceAttachment[],
	): Promise<void> {
		const context = environment.orchestrationContext;
		const delegate = context.domainContext?.builderDelegate;
		if (!delegate) return;
		for (const attachment of attachments) {
			if (attachment.type !== 'agent') continue;
			const target = { agentId: attachment.id, projectId: attachment.projectId };
			await snapshotAgent(context, delegate, target, 'attached');
		}
	}

	private hostMetadataOf(
		options: AssistantTurnOptions,
		promptVersion: string | undefined,
		trace: AssistantTurnTrace | undefined,
	): JSONObject {
		return {
			[ASSISTANT_TURN_METADATA_KEY]: serializeAssistantTurnOptions(options),
			promptVersion: promptVersion ?? null,
			...trace?.hostMetadata(),
		};
	}

	/**
	 * The error that the turn shows and reports. A masked stream failure becomes
	 * the credit error when the balance is used up, because a credit stop at the
	 * model call can arrive in that form. The reporter then keeps it out of Sentry.
	 */
	private async resolveShownError(user: User, error: unknown): Promise<unknown> {
		if (!isMaskedStreamFailure(error)) return error;
		try {
			await this.turnEnvironment.assertAssistantCreditsAvailable(user);
			return error;
		} catch (creditsError) {
			return creditsError;
		}
	}

	/**
	 * Reports a failed turn like the current runtime. The reporter keeps credit
	 * and stream transport errors out of Sentry.
	 */
	private reportTurnError(
		error: unknown,
		component: 'instance-ai-stream' | 'instance-ai-run',
		turn: SystemAgentTurn<AssistantSandboxLease>,
		options: AssistantTurnOptions,
		trace: AssistantTurnTrace | undefined,
	): void {
		const { runId, messageGroupId } = options;
		// A failed report must not replace the turn error or skip the cleanup of the turn.
		try {
			this.errorReporter.report(error ?? new Error('Assistant turn errored'), {
				component,
				...(component === 'instance-ai-stream' ? { providerStream: true } : {}),
				threadId: turn.thread.id,
				runId,
				projectId: turn.thread.projectId,
				userId: turn.user.id,
				agentId: orchestratorAgentId(runId),
				messageGroupId,
				...(trace ? { tracing: trace.context } : {}),
			});
		} catch (reportError) {
			this.logger.warn('Failed to report the Assistant turn error', {
				threadId: turn.thread.id,
				runId,
				error: reportError,
			});
		}
	}

	/**
	 * Archives the workflows that the thread still marks as temporary: failed
	 * attempts and scratch workflows that no build promoted. Best effort.
	 */
	private async archiveTemporaryWorkflows(
		workflowService: Pick<InstanceAiWorkflowService, 'archiveIfAiTemporary'>,
		markers: TemporaryWorkflowMarkers | undefined,
		threadId: string,
	): Promise<string[]> {
		if (!markers) return [];
		let workflowIds: string[] = [];
		try {
			workflowIds = await markers.list();
		} catch (error) {
			this.logger.warn('Failed to read the temporary workflows of an Assistant thread', {
				threadId,
				error: getErrorMessage(error),
			});
		}
		const archived: string[] = [];
		for (const workflowId of workflowIds) {
			try {
				if (await workflowService.archiveIfAiTemporary(workflowId)) {
					archived.push(workflowId);
					continue;
				}
				// A marked workflow that is not archived was deleted or is out of reach.
				// Thread metadata has no foreign key to drop it, so drop the marker here.
				await markers.unmark(workflowId);
			} catch (error) {
				this.logger.warn('Failed to archive a temporary Assistant workflow', {
					threadId,
					workflowId,
					error: getErrorMessage(error),
				});
			}
		}
		return archived;
	}

	/** Tells the chat which workflows the turn end archived, so it can mark their artifacts. */
	private emitArchivedWorkflows(
		turn: SystemAgentTurn<AssistantSandboxLease>,
		threadId: string,
		workflowIds: string[],
	): void {
		if (workflowIds.length === 0) return;
		try {
			turn.emitHostEvent(ASSISTANT_WORKFLOWS_ARCHIVED_EVENT, { workflowIds }, { key: 'turn' });
		} catch (error) {
			this.logger.warn('Failed to send the archived Assistant workflows to the chat', {
				threadId,
				error: getErrorMessage(error),
			});
		}
	}

	/** Claims the turn's model usage against the Assistant credits. Best effort. */
	private async claimTurnUsage(
		user: User,
		threadId: string,
		runId: string,
		outcome: SystemAgentTurnOutcome,
		usage: { model: string; usage: TokenUsage } | undefined,
	): Promise<void> {
		if (!usage) return;
		try {
			await this.creditService.claimRunUsage(
				user,
				threadId,
				outcome.executionId ?? `${runId}:${nanoid()}`,
				tokenUsageToBuilderUsageItems(usage.model, usage.usage),
				outcome.status,
			);
		} catch (error) {
			this.logger.warn('Failed to claim Assistant turn usage', {
				threadId,
				runId,
				error: getErrorMessage(error),
			});
		}
	}

	/**
	 * Claims a side call of the run, such as the title call, against the
	 * Assistant credits. Best effort.
	 */
	private async claimSideCallUsage(
		user: User,
		threadId: string,
		runId: string,
		report: SideCallUsageReport,
	): Promise<void> {
		// The memory options claim these through `onTaskUsage`, which reports each call again here.
		if (MEMORY_OPTION_CLAIMED_TASKS.has(report.task)) return;
		await this.creditService.claimSideCallUsage(
			user,
			threadId,
			`${runId}:${report.task}:${report.reportId}`,
			report,
		);
	}
}

/** Side calls that the memory options of the agent factory already claim. */
const MEMORY_OPTION_CLAIMED_TASKS: ReadonlySet<SideCallUsageReport['task']> = new Set([
	'observer',
	'reflector',
]);

/**
 * The text and code that the chat shows for a turn error. A refused file stays
 * in the thread history, because the runtime saves the turn input first.
 */
function toFormattedTurnError(shown: unknown): FormattedTurnError {
	const code = getUserFacingErrorCode(shown);
	const message = getUserFacingErrorMessage(
		shown,
		undefined,
		isAttachmentRejectedByProviderError(shown) ? { attachmentRemoved: false } : {},
	);
	return { message, ...(code ? { code } : {}) };
}

function modelLabel(modelId: ModelConfig): string {
	return modelConfigId(modelId) ?? 'unknown';
}
