import type { JSONObject, TokenUsage } from '@n8n/agents';
import {
	InstanceAiConfirmRequestDto,
	type InstanceAiAgentAttachment,
	type InstanceAiAttachment,
	type InstanceAiFileAttachment,
	type InstanceAiNodesAttachment,
	type InstanceAiResourceAttachment,
	type InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig, type AiConfig, type InstanceAiConfig } from '@n8n/config';
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

/** The resource attachments that reach the agent. Node attachments need their gate. */
type FormattedTurnError = NonNullable<
	Awaited<ReturnType<NonNullable<SystemAgentTurnHandle['formatError']>>>
>;

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

	private readonly instanceAiConfig: InstanceAiConfig;

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
		this.instanceAiConfig = globalConfig.instanceAi;
		this.aiConfig = globalConfig.ai;
	}

	/** The runtime already requires `project:read` on the working project. */
	async authorize(user: User): Promise<boolean> {
		return (
			hasGlobalScope(user, 'instanceAi:message') &&
			this.settingsService.isAgentEnabled() &&
			Boolean(this.instanceAiConfig.model)
		);
	}

	async chatTurnOptions(
		_user: User,
		_thread: SystemAgentTurn['thread'],
		clientContext?: Record<string, unknown>,
	): Promise<SystemAgentTurnOptions> {
		return serializeAssistantTurnOptions(createAssistantTurnOptions(clientContext));
	}

	/** Cards send the confirmation body of the Assistant chat. Tools expect their resume data. */
	normalizeResumeData(resumeData: unknown): unknown {
		const parsed = InstanceAiConfirmRequestDto.safeParse(resumeData);
		return parsed.success ? buildResumeData(toConfirmationData(parsed.data)) : resumeData;
	}

	async prepareTurn(turn: SystemAgentTurn<AssistantSandboxLease>): Promise<SystemAgentTurnHandle> {
		const options = readAssistantTurnOptions(
			turn.type === 'start'
				? turn.options
				: turn.checkpointHostMetadata[ASSISTANT_TURN_METADATA_KEY],
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
			isReplanFollowUp: false,
			isPostPlanFollowUp: false,
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
				isMachineFollowUp: false,
				threadArtifacts: request.threadArtifacts,
			});
		}

		const agent = await this.agentFactory.createAgent(environment, runtime, {
			user,
			threadId: thread.id,
			runId,
		});

		let usage: { model: string; usage: TokenUsage } | undefined;
		let inputAccepted = turnInput === undefined;
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
			},
			onChunk: (chunk) => {
				// The SDK stores the input when it receives it, so the first chunk means it is accepted.
				if (!inputAccepted && turnInput) {
					inputAccepted = true;
					void this.turnInput
						.onInputAccepted(environment, runtime, turnInput, { user, threadId: thread.id, runId })
						.catch((error: unknown) => {
							this.logger.warn('Failed to record the accepted n8n Assistant turn input', {
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
				await this.claimTurnUsage(user, thread.id, runId, outcome, usage);
				// A suspended turn can still be building the workflows it marked.
				if (outcome.status !== 'suspended') {
					await this.archiveTemporaryWorkflows(environment, runtime, thread.id);
				}
			},
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
			syncWorkflowTasks: async () => {},
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
	 * credit stop at the model call can arrive in that form.
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
		return { message: getUserFacingErrorMessage(shown), ...(code ? { code } : {}) };
	}

	/**
	 * Archives the workflows that the thread still marks as temporary: failed
	 * attempts and scratch workflows that no build promoted. Best effort.
	 */
	private async archiveTemporaryWorkflows(
		environment: AssistantTurnEnvironment,
		runtime: AssistantTurnRuntime,
		threadId: string,
	): Promise<void> {
		const markers = runtime.temporaryWorkflowMarkers;
		if (!markers) return;
		let workflowIds: string[] = [];
		try {
			workflowIds = await markers.list();
		} catch (error) {
			this.logger.warn('Failed to read the temporary workflows of an n8n Assistant thread', {
				threadId,
				error: getErrorMessage(error),
			});
		}
		for (const workflowId of workflowIds) {
			try {
				await environment.context.workflowService.archiveIfAiTemporary(workflowId);
			} catch (error) {
				this.logger.warn('Failed to archive a temporary n8n Assistant workflow', {
					threadId,
					workflowId,
					error: getErrorMessage(error),
				});
			}
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
			this.logger.warn('Failed to claim n8n Assistant turn usage', {
				threadId,
				runId,
				error: getErrorMessage(error),
			});
		}
	}
}

function modelLabel(modelId: ModelConfig): string {
	return modelConfigId(modelId) ?? 'unknown';
}
