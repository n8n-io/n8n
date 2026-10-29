import type { JSONObject, SideCallUsageReport, TokenUsage } from '@n8n/agents';
import {
	ASSISTANT_WORKFLOWS_ARCHIVED_EVENT,
	InstanceAiConfirmRequestDto,
	type InstanceAiAgentAttachment,
	type InstanceAiAttachment,
	type InstanceAiFileAttachment,
	type InstanceAiNodesAttachment,
	type InstanceAiResourceAttachment,
	type InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig, type AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	MAX_STEPS,
	modelConfigId,
	tokenUsageToBuilderUsageItems,
	type ModelConfig,
} from '@n8n/instance-ai';
import { buildResumeData, toConfirmationData } from '@n8n/instance-ai/confirmation-payload';
import { hasGlobalScope } from '@n8n/permissions';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { nanoid } from 'nanoid';

import type {
	SystemAgentProvider,
	SystemAgentStartTurn,
	SystemAgentTurn,
	SystemAgentTurnHandle,
	SystemAgentTurnOptions,
	SystemAgentTurnOutcome,
} from '@/modules/agents/system-agents/system-agent.types';
import { modelStreamStallOptions } from '@/utils/model-stream-stall-options';

import { InstanceAiCreditService } from '../instance-ai-credit.service';
import { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import {
	getUserFacingErrorCode,
	getUserFacingErrorMessage,
	isAttachmentRejectedByProviderError,
	isMaskedStreamFailure,
} from '../user-facing-errors';
import { AssistantAgentFactory } from '../turn-setup/assistant-agent.factory';
import {
	AssistantTurnEnvironmentFactory,
	type AssistantTurnEnvironment,
} from '../turn-setup/assistant-turn-environment.factory';
import {
	AssistantTurnInputBuilder,
	type AssistantTurnInput,
} from '../turn-setup/assistant-turn-input.builder';
import type { AssistantTurnRuntime } from '../turn-setup/assistant-turn-runtime';
import { AssistantEventSink } from './assistant-event-sink';
import { createThreadTemporaryWorkflowMarkers } from './assistant-temporary-workflow-markers';
import {
	ASSISTANT_AGENT_ID,
	ASSISTANT_AGENT_NAME,
	ASSISTANT_TURN_METADATA_KEY,
	createAssistantTurnOptions,
	readAssistantTurnOptions,
	serializeAssistantTurnOptions,
	type AssistantTurnOptions,
} from './assistant-turn-options';
import {
	AssistantSandboxWorkspaceSource,
	type AssistantSandboxLease,
} from './assistant-workspace-source';

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
			| InstanceAiNodesAttachment =>
			attachment.type === 'workflow' ||
			attachment.type === 'agent' ||
			(attachment.type === 'nodes' && nodeContextEnabled),
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

	/** A setup failure, such as the credit check before the run, gets the turn's error text. */
	async formatSetupError(user: User, error: unknown): Promise<FormattedTurnError> {
		return await this.formatTurnError(user, error);
	}

	async prepareTurn(turn: SystemAgentTurn<AssistantSandboxLease>): Promise<SystemAgentTurnHandle> {
		const options = readAssistantTurnOptions(
			turn.type === 'start'
				? turn.options
				: turn.checkpointHostMetadata[ASSISTANT_TURN_METADATA_KEY],
			this.logger,
		);
		const { user, thread } = turn;
		const { runId, request } = options;
		const runtime = this.createTurnRuntime(turn, options);
		const experimentGates = await this.adapterService.resolveExperimentGates(user);
		const environment = await this.turnEnvironment.create(
			{
				user,
				threadId: thread.id,
				runId,
				abortSignal: turn.abortSignal,
				messageGroupId: options.messageGroupId,
				pushRef: request.pushRef,
				experimentGates,
			},
			runtime,
		);
		const fileAttachments = turn.type === 'start' ? await this.readFileAttachments(turn) : [];
		this.turnInput.applyTurnScope(environment, {
			threadId: thread.id,
			runId,
			message: turn.type === 'start' ? turn.message : '',
			timeZone: request.timeZone,
			fileAttachments,
		});

		let turnInput: AssistantTurnInput | undefined;
		if (turn.type === 'start') {
			turnInput = await this.turnInput.buildInput(environment, runtime, {
				user,
				threadId: thread.id,
				runId,
				message: turn.message,
				fileAttachments,
				contextAttachments: contextAttachmentsOf(
					request.attachments,
					experimentGates.nodeContextEnabled,
				),
				handoffContext: request.context,
				timeZone: request.timeZone,
				threadArtifacts: request.threadArtifacts,
				titledByRuntime: true,
			});
		}

		const agent = await this.agentFactory.createAgent(environment, runtime, {
			user,
			threadId: thread.id,
			runId,
			generateTitle: true,
		});

		let usage: { model: string; usage: TokenUsage } | undefined;
		let inputAccepted: Promise<void> | undefined;
		return {
			agent,
			// The runtime adds the files to the model input as stored references, so the
			// input keeps only the text. The file content is for the file tools.
			...(turnInput ? { input: turnInput.fullMessage } : {}),
			hostMetadata: this.hostMetadataOf(options, environment.skillScope.profile.mode),
			runOptions: {
				maxIterations: MAX_STEPS.ORCHESTRATOR,
				// Recover token usage from raw provider events, so a stopped run is still billed.
				recoverUsageOnAbort: true,
				...modelStreamStallOptions(this.aiConfig),
				providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
				// The input carries context blocks before the user's words, so title the words only.
				...(turn.type === 'start' ? { titleText: turn.message } : {}),
			},
			onChunk: (chunk) => {
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
				// Finish before the host events close and the next queued turn reads the cursor.
				await inputAccepted;
				await this.claimTurnUsage(user, thread.id, runId, outcome, usage);
				// A suspended turn can still be building the workflows it marked.
				if (outcome.status !== 'suspended') {
					const archived = await this.archiveTemporaryWorkflows(environment, runtime, thread.id);
					this.emitArchivedWorkflows(turn, thread.id, archived);
				}
			},
			onSideCallUsage: async (report) =>
				await this.claimSideCallUsage(user, thread.id, runId, report),
			formatError: async (error) => await this.formatTurnError(user, error),
		};
	}

	/** Binds the Agents runtime state of one turn for the shared turn setup. */
	private createTurnRuntime(
		turn: SystemAgentTurn<AssistantSandboxLease>,
		options: AssistantTurnOptions,
	): AssistantTurnRuntime {
		const { request } = options;
		const lease = turn.workspace;
		return {
			memory: turn.memory,
			resourceId: turn.resourceId,
			temporaryWorkflowMarkers: createThreadTemporaryWorkflowMarkers(turn.memory, turn.thread.id),
			getProjectId: async () => turn.thread.projectId,
			eventBus: new AssistantEventSink(turn.emitHostEvent, this.logger),
			checkpointStore: turn.checkpointStore,
			turnState: {
				getBuildMode: () => request.mode,
				setBuildMode: () => {},
				getPromptVersion: () => request.promptVersion,
				setPromptConfiguration: () => {},
				setSetupPanelEnabled: () => {},
				getBrowserUseAvailable: () => request.browserUseAvailable,
				getObserverThresholdTokens: () => request.observerThresholdTokens,
			},
			sessionGrants: turn.sessionGrants,
			onDomainAccessTracker: () => {},
			readSetupItemsSnapshots: async () => [],
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

	/** The content of the turn's files, for the file tools of the turn. */
	private async readFileAttachments(
		turn: SystemAgentStartTurn<AssistantSandboxLease>,
	): Promise<InstanceAiFileAttachment[]> {
		const files: InstanceAiFileAttachment[] = [];
		for (const ref of turn.attachments) {
			const content = await turn.readAttachment(ref);
			if (!content) continue;
			files.push({
				type: 'file',
				data: content.toString('base64'),
				mimeType: ref.mimeType,
				fileName: ref.fileName,
			});
		}
		return files;
	}

	private hostMetadataOf(options: AssistantTurnOptions, buildMode: string | undefined): JSONObject {
		return {
			[ASSISTANT_TURN_METADATA_KEY]: serializeAssistantTurnOptions(options),
			buildMode: buildMode ?? null,
			promptVersion: options.request.promptVersion ?? null,
		};
	}

	/**
	 * The text and code that the chat shows for a turn error. A masked stream
	 * failure is shown as a credit error when the balance is used up, because a
	 * credit stop at the model call can arrive in that form. A refused file stays
	 * in the thread history, because the runtime saves the turn input first.
	 */
	private async formatTurnError(user: User, error: unknown): Promise<FormattedTurnError> {
		let shown = error;
		if (isMaskedStreamFailure(error)) {
			try {
				await this.turnEnvironment.assertAssistantCreditsAvailable(user);
			} catch (creditsError) {
				shown = creditsError;
			}
		}
		const code = getUserFacingErrorCode(shown);
		const message = getUserFacingErrorMessage(
			shown,
			undefined,
			isAttachmentRejectedByProviderError(shown) ? { attachmentRemoved: false } : {},
		);
		return { message, ...(code ? { code } : {}) };
	}

	/**
	 * Archives the workflows that the thread still marks as temporary: failed
	 * attempts and scratch workflows that no build promoted. Best effort.
	 */
	private async archiveTemporaryWorkflows(
		environment: AssistantTurnEnvironment,
		runtime: AssistantTurnRuntime,
		threadId: string,
	): Promise<string[]> {
		const markers = runtime.temporaryWorkflowMarkers;
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
				if (await environment.context.workflowService.archiveIfAiTemporary(workflowId)) {
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
		try {
			const items = tokenUsageToBuilderUsageItems(report.model, report.usage);
			if (items.length === 0) return;
			await this.creditService.claimRunUsage(
				user,
				threadId,
				`${runId}:${report.task}:${report.reportId}`,
				items,
				'completed',
			);
		} catch (error) {
			this.logger.warn('Failed to claim Assistant side-call usage', {
				threadId,
				runId,
				task: report.task,
				error: getErrorMessage(error),
			});
		}
	}
}

/** Side calls that the memory options of the agent factory already claim. */
const MEMORY_OPTION_CLAIMED_TASKS: ReadonlySet<SideCallUsageReport['task']> = new Set([
	'observer',
	'reflector',
]);

function modelLabel(modelId: ModelConfig): string {
	return modelConfigId(modelId) ?? 'unknown';
}
