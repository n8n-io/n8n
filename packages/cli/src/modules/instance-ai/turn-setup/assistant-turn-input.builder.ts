import { loadReplayedMessages, type AgentDbMessage, type Message } from '@n8n/agents';
import type {
	AiPreferencesAppliedPayload,
	InstanceAiAgentAttachment,
	InstanceAiFileAttachment,
	InstanceAiHandoffContext,
	InstanceAiResourceAttachment,
	InstanceAiThreadArtifactsContext,
	InstanceAiWorkflowAttachment,
	InstanceContextInjection,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	UrlService,
	AI_PREFERENCES_CLEARED_BLOCK,
	AiPreferenceService,
	buildAppliedPreferencesPayload,
	renderAiPreferencesBlock,
} from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { type User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	classifyAttachments,
	buildAttachmentManifest,
	getDateTimeSection,
	isParseableAttachment,
	enrichMessageWithBackgroundTasks,
	truncateToTitle,
	patchThread,
	formatWorkflowSetupStateNote,
	isSetupPanelEnabled,
	observeWorkflowSetupStates,
	orchestratorAgentId,
	saveAgentBuilderTarget,
	type InstanceAiContext,
	type ManagedBackgroundTask,
	type ProjectSummary,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { isRecord } from '@n8n/utils/is-record';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import type { AssistantTurnEnvironment } from './assistant-turn-environment.factory';
import type { AssistantTurnRuntime } from './assistant-turn-runtime';
import {
	assertAgentPreviewHandoffScopes,
	resolveAgentPreviewHandoff,
} from '../agent-preview-handoff';
import { getAgentContextService } from '../agents-access';
import {
	INSTANCE_CONTEXT_CURSOR,
	InstanceContextService,
	readInstanceContextCursor,
	toContextInjection,
	shouldTraceContextInjection,
	type InstanceContextResult,
} from '../instance-context.service';
import { InstanceAiSkillsService, SKILLS } from '../instance-ai-skills.service';
import {
	asStoredThreadContextSection,
	buildCurrentDateTimeBlock,
	buildInstanceUrlsBlock,
	buildOnboardingSkillBlock,
	buildPastConversationsBlock,
	buildProjectContextBlock,
	buildThreadArtifactsBlock,
	buildThreadContextBlock,
	buildWorkflowTestRequestBlock,
	CREDENTIAL_CONTEXT_CLOSE_TAG,
	CREDENTIAL_CONTEXT_OPEN_TAG,
	extractAiPreferencesBlock,
	extractStoredMessageText,
	extractThreadArtifactsBlock,
	getProjectContextSection,
	WORKFLOW_SETUP_STATE_CLOSE_TAG,
	WORKFLOW_SETUP_STATE_OPEN_TAG,
} from '../internal-messages';
import { ONBOARDING_OPENING } from '../onboarding-opening';
import { type OrchestratorResumeReason } from '../tracing';

/** Workflow/agent attachments carry a display name; a nodes attachment doesn't. */
function isNamedResourceAttachment(
	attachment: InstanceAiResourceAttachment,
): attachment is InstanceAiWorkflowAttachment | InstanceAiAgentAttachment {
	return attachment.type !== 'nodes' && Boolean(attachment.name);
}

function buildHandoffContextBlock(context: InstanceAiHandoffContext | undefined): string {
	if (context?.source !== 'credential-modal') return '';

	const { credential } = context;
	const placeholderTitles = credential.placeholderTitles ?? [];
	const lines = [
		`- Credential type: \`${credential.credentialType}\` (${credential.displayName}).`,
		credential.id ? `- Existing credential id: \`${credential.id}\`.` : '',
		credential.nodeName ? `- Node name: "${credential.nodeName}".` : '',
		credential.nodeType ? `- Node type: \`${credential.nodeType}\`.` : '',
		placeholderTitles.length
			? `- The credential form is fully pre-filled from a recipe; the user only pastes: ${placeholderTitles.map((title) => `"${title}"`).join(', ')}.`
			: '',
		credential.docsUrl
			? `- The provider page where the user creates/copies the secret (verified during recipe research): ${credential.docsUrl}`
			: '',
		credential.documentationUrl ? `- n8n documentation URL: ${credential.documentationUrl}` : '',
		credential.oauthRedirectUrl
			? `- OAuth redirect/callback URL shown in the modal: ${credential.oauthRedirectUrl}`
			: '',
	].filter(Boolean);
	const prose = [
		'The user opened this conversation from the credential setup modal and is asking for setup guidance.',
		...lines,
		'Use this metadata only as setup context. Never ask the user to paste credential secrets into chat. For credential setup docs, load `n8n-docs-assistant` and use `n8n-docs` with `intent: "credential-setup"`.',
		placeholderTitles.length
			? `Because the form is pre-filled, give step-by-step guidance on where to obtain the listed value(s) on the provider side${credential.docsUrl ? ' — direct the user to the provider page above rather than re-researching' : ' (research the provider if needed)'} — and do NOT suggest editing the auth template, test URL, or any other credential field.`
			: '',
	]
		.filter(Boolean)
		.join('\n');

	return `${CREDENTIAL_CONTEXT_OPEN_TAG}\n${JSON.stringify(context)}\n\n${prose}\n${CREDENTIAL_CONTEXT_CLOSE_TAG}`;
}

export interface AssistantTurnScopeParams {
	threadId: string;
	runId: string;
	message: string;
	timeZone?: string;
	fileAttachments: InstanceAiFileAttachment[];
}

/** What the turn input build needs from the runtime that runs the turn. */
export type AssistantTurnInputRuntime = Pick<
	AssistantTurnRuntime,
	'eventBus' | 'resourceId' | 'getRunningBackgroundTasks'
>;

export interface AssistantTurnInputParams {
	user: User;
	threadId: string;
	runId: string;
	message: string;
	fileAttachments: InstanceAiFileAttachment[];
	contextAttachments: InstanceAiResourceAttachment[];
	handoffContext?: InstanceAiHandoffContext;
	timeZone?: string;
	resumeReason?: OrchestratorResumeReason;
	threadArtifacts?: InstanceAiThreadArtifactsContext;
	/** Receives the instance-context summary as soon as the block is built. */
	onInstanceContextInjection?: (injection: InstanceContextInjection) => void;
	/**
	 * The agent runtime titles the thread after the turn. The opening turn then
	 * keeps only the final titles of a hand-off or an onboarding thread, and
	 * leaves an ordinary thread without a title for the runtime.
	 */
	titledByRuntime?: boolean;
}

/**
 * Thread metadata key that the opening turn sets. A thread can stay untitled
 * after its opening turn while the agents runtime titles it in the background.
 */
export const OPENED_METADATA_KEY = 'assistantOpened';

export interface AssistantTurnInput {
	/** The model input text: handoff and setup blocks, thread context, then the user message. */
	fullMessage: string;
	/** Attachments that go to the model as file parts. */
	nonStructuredAttachments: InstanceAiFileAttachment[];
	turnHadFileAttachments: boolean;
	instanceContext: InstanceContextResult;
	contextInjection: InstanceContextInjection;
	aiPreferencesTurn?: { block: string | undefined; payload: AiPreferencesAppliedPayload };
}

/**
 * The agent input for a turn: a plain prompt, or a user message with file
 * parts when the turn has attachments the model reads directly.
 */
export function buildTurnStreamInput(input: AssistantTurnInput): string | Message[] {
	const { fullMessage, nonStructuredAttachments } = input;
	// Attachments need the explicit message-object shape (text + file blocks);
	// a plain prompt goes through as a string. The SDK assigns the message id
	// and persists the input on receipt.
	if (nonStructuredAttachments.length === 0) return fullMessage;
	return [
		{
			role: 'user' as const,
			content: [
				{ type: 'text' as const, text: fullMessage },
				...nonStructuredAttachments.map((attachment) => ({
					type: 'file' as const,
					data: attachment.data,
					mediaType: attachment.mimeType,
				})),
			],
		},
	];
}

/**
 * Builds what the agent reads at the start of an Assistant turn: the turn
 * scope on the tool context, and the input message with its handoff, setup
 * state and thread context blocks.
 */
@Service()
export class AssistantTurnInputBuilder {
	private readonly logger: Logger;

	private readonly defaultTimeZone: string;

	private readonly webhookBaseUrl: string;

	private readonly formBaseUrl: string;

	constructor(
		logger: Logger,
		globalConfig: GlobalConfig,
		urlService: UrlService,
		private readonly errorReporter: ErrorReporter,
		private readonly skillsService: InstanceAiSkillsService,
		private readonly instanceContext: InstanceContextService,
		private readonly aiPreferenceService: AiPreferenceService,
	) {
		this.logger = logger.scoped('instance-ai');
		this.defaultTimeZone = globalConfig.generic.timezone;
		this.webhookBaseUrl = `${urlService.getWebhookBaseUrl()}${globalConfig.endpoints.webhook}`;
		this.formBaseUrl = `${urlService.getWebhookBaseUrl()}${globalConfig.endpoints.form}`;
	}

	/** Sets the per-turn fields on the tool contexts. */
	applyTurnScope(environment: AssistantTurnEnvironment, params: AssistantTurnScopeParams): void {
		const { context, orchestrationContext, workflowTasks } = environment;
		const { threadId, runId, message, timeZone, fileAttachments } = params;
		// Make the current user message available since memory history only
		// returns previously-saved messages.
		orchestrationContext.currentUserMessage = message;
		orchestrationContext.timeZone = timeZone ?? this.defaultTimeZone;

		context.workflowBuildContext = {
			threadId,
			runId,
			taskId: `build-${runId}`,
			workItemId: `wi_${nanoid(8)}`,
			workflowTaskService: workflowTasks,
		};

		// Thread file attachments into the domain context so parse-file can access them
		if (fileAttachments.length > 0) {
			context.currentUserAttachments = fileAttachments;
		}
	}

	async buildInput(
		environment: AssistantTurnEnvironment,
		runtime: AssistantTurnInputRuntime,
		params: AssistantTurnInputParams,
	): Promise<AssistantTurnInput> {
		const {
			context,
			memory,
			taskStorage,
			conversationHistory,
			aiPreferencesEnabled,
			instanceContextEnabled,
			skillScope,
		} = environment;
		const { eventBus } = runtime;
		const {
			user,
			threadId,
			runId,
			message,
			fileAttachments,
			contextAttachments,
			handoffContext,
			timeZone,
			resumeReason,
			threadArtifacts,
			onInstanceContextInjection,
			titledByRuntime = false,
		} = params;
		let turnHadFileAttachments = false;

		const enrichedMessage = await enrichMessageWithBackgroundTasks(
			message,
			runtime.getRunningBackgroundTasks?.() ?? [],
			{
				formatTask: async (task: ManagedBackgroundTask) =>
					`[Running task — ${task.role}]: taskId=${task.taskId}`,
			},
		);

		let handoffContextBlock = '';
		let agentPreviewTitleFallback: string | undefined;
		if (handoffContext?.source === 'agent-preview') {
			const projectId = context.projectId;
			if (!projectId) {
				throw new UnexpectedError(
					`Assistant thread "${threadId}" has no bound project; agent-preview handoff requires a project`,
				);
			}
			await assertAgentPreviewHandoffScopes(user, projectId);
			const agents = getAgentContextService();
			if (!agents) {
				throw new UserError('Agent preview handoff is not available');
			}
			const resolved = await resolveAgentPreviewHandoff(handoffContext, {
				projectId,
				userId: user.id,
				getThreadDetail: async (threadId, projectId, agentId) =>
					await agents.readSession(user, projectId, agentId, threadId),
			});
			handoffContextBlock = resolved.block;
			agentPreviewTitleFallback = resolved.titleFallback;

			context.agentBuilderTarget = resolved.target;
			context.agentPreviewSession = {
				agentId: handoffContext.agentId,
				threadId: handoffContext.threadId,
				...(handoffContext.executionId ? { executionId: handoffContext.executionId } : {}),
			};
			await saveAgentBuilderTarget(context, resolved.target, {
				previewSession: context.agentPreviewSession,
			});
		} else if (handoffContext?.source === 'setup-panel-execute' && isSetupPanelEnabled(context)) {
			handoffContextBlock = buildWorkflowTestRequestBlock(handoffContext.workflowId);
		} else {
			handoffContextBlock = buildHandoffContextBlock(handoffContext);
		}

		// Internal follow-ups carry their own instructions; only a user turn
		// needs the recomputed setup state.
		const setupStateBlock =
			resumeReason === undefined ? await this.buildWorkflowSetupStateBlock(context) : '';

		// Set a heuristic title before the agent starts, unless the agents runtime
		// titles the thread after the turn. For an editor hand-off the user text is empty (the workflow is the
		// message), so title it with the workflow name and mark it refined so
		// the LLM title pass doesn't summarize the internal context block.
		const thread = await memory.getThread(threadId);
		// An onboarding thread is titled at creation and opens with a seeded greeting. Its first
		// user turn answers it, and is the turn that marks the title final below.
		const unopenedOnboarding =
			thread?.metadata?.source === 'onboarding' && !thread.metadata.titleRefined;
		// The opening turn sets the opened flag. Threads from before the flag have no flag, and
		// their opening turn left a title, so "no title yet" still marks the opening turn for them.
		const isOpeningTurn = Boolean(
			thread && !thread.metadata?.[OPENED_METADATA_KEY] && (!thread.title || unopenedOnboarding),
		);
		const onboardingSkill = unopenedOnboarding
			? (await this.skillsService.loadSkill(SKILLS.suggestAutomations, skillScope)).instructions
			: undefined;

		const handoffTitle = unopenedOnboarding
			? ONBOARDING_OPENING.title
			: (contextAttachments.find(isNamedResourceAttachment)?.name ?? agentPreviewTitleFallback);

		if (isOpeningTurn) {
			await patchThread(memory, {
				threadId,
				update: ({ metadata }) => {
					const opened = { ...metadata, [OPENED_METADATA_KEY]: true };
					if (handoffTitle) {
						return {
							title: truncateToTitle(handoffTitle),
							metadata: { ...opened, titleRefined: true },
						};
					}
					// The agents runtime titles an ordinary thread after the turn.
					if (titledByRuntime) return { metadata: opened };
					// Attachment-only openers keep a title too.
					return {
						title: truncateToTitle(message) || truncateToTitle(fileAttachments[0]?.fileName ?? ''),
						metadata: opened,
					};
				},
			});
		}

		// Sent in full on a thread's first turn and as additions after that: the earlier block
		// stays in the conversation, so re-sending it pays for the same context twice.
		const instanceContext = await this.instanceContext.buildBlock({
			user,
			scope: {
				surface: 'conversation',
				...(context.projectId !== undefined ? { projectId: context.projectId } : {}),
			},
			cursor: readInstanceContextCursor(thread?.metadata),
			enabled: instanceContextEnabled,
		});

		// Share the same injection summary with trace and telemetry.
		const contextInjection = toContextInjection(instanceContext);
		onInstanceContextInjection?.(contextInjection);

		// Publish the summary before the agent starts. Keep the raw block on the server.
		if (shouldTraceContextInjection(contextInjection)) {
			eventBus.publish(threadId, {
				type: 'instance-context',
				runId,
				agentId: orchestratorAgentId(runId),
				payload: { injection: contextInjection },
			});
		}
		const existingTasks = await taskStorage.get(threadId);
		if (existingTasks) {
			eventBus.publish(threadId, {
				type: 'tasks-update',
				runId,
				agentId: orchestratorAgentId(runId),
				payload: { tasks: existingTasks },
			});
		}

		let nonStructuredAttachments: InstanceAiFileAttachment[] = [];
		let attachmentManifest = '';
		let hasParseableAttachment = false;

		if (fileAttachments.length > 0) {
			const classifiedAttachments = classifyAttachments(fileAttachments);
			nonStructuredAttachments = fileAttachments.filter(
				(attachment) => !isParseableAttachment(attachment),
			);
			turnHadFileAttachments = nonStructuredAttachments.length > 0;
			hasParseableAttachment = classifiedAttachments.some(
				(attachment: { parseable: boolean }) => attachment.parseable,
			);
			attachmentManifest = buildAttachmentManifest(classifiedAttachments);
		}

		const messageBody =
			!message && hasParseableAttachment
				? `The user attached file(s) without a message. Inspect the first parseable attachment with parse-file and provide a concise summary.\n\n${attachmentManifest}`
				: attachmentManifest
					? `${enrichedMessage}\n\n${attachmentManifest}`
					: enrichedMessage;

		// Keep setup handoffs first and the user's message last.
		// Group ambient context in the thread-context wrapper.
		// One read of the replayed history serves every section sent only when it changed.
		// The Assistant agent always runs with observational memory, so read the same window.
		let replayedHistory: Promise<AgentDbMessage[]> | undefined;
		const loadReplayedHistory = async () =>
			await (replayedHistory ??= loadReplayedMessages(
				memory,
				{ threadId, resourceId: runtime.resourceId },
				{ observationalMemory: true },
			));
		const threadArtifactsBlock =
			resumeReason === undefined
				? await this.resolveThreadArtifactsTurn(
						threadId,
						threadArtifacts,
						contextAttachments,
						loadReplayedHistory,
					)
				: '';
		const [boundProject, pastConversationsSection] = await Promise.all([
			this.resolveBoundProject(context),
			isOpeningTurn ? conversationHistory?.getPastConversationsSection() : undefined,
		]);
		const projectSection = boundProject ? getProjectContextSection(boundProject) : undefined;
		// Every user turn, not only the opening one, so a preference saved in another
		// session reaches this thread on its next turn. Internal follow-ups skip it the
		// same way they skip the other ambient context: the block from the user turn is
		// already in the history the follow-up replays.
		const aiPreferencesTurn =
			aiPreferencesEnabled && resumeReason === undefined
				? await this.resolveAiPreferencesTurn(user.id, boundProject, threadId, loadReplayedHistory)
				: undefined;
		const threadContextBlock = buildThreadContextBlock([
			instanceContext.state === 'injected' ? instanceContext.block : '',
			// The onboarding skill rides the opening turn, so it fires without a `load_skill` call
			// and stays in the history for the later turns.
			onboardingSkill ? buildOnboardingSkillBlock(onboardingSkill) : undefined,
			threadArtifactsBlock,
			projectSection ? buildProjectContextBlock(projectSection) : undefined,
			resumeReason === undefined
				? buildInstanceUrlsBlock({
						webhookBaseUrl: this.webhookBaseUrl,
						formBaseUrl: this.formBaseUrl,
					})
				: undefined,
			pastConversationsSection ? buildPastConversationsBlock(pastConversationsSection) : undefined,
			aiPreferencesTurn?.block,
			buildCurrentDateTimeBlock(getDateTimeSection(timeZone ?? this.defaultTimeZone)),
		]);
		const fullMessage = [handoffContextBlock, setupStateBlock, threadContextBlock, messageBody]
			.filter(Boolean)
			.join('\n\n');

		return {
			fullMessage,
			nonStructuredAttachments,
			turnHadFileAttachments,
			instanceContext,
			contextInjection,
			aiPreferencesTurn,
		};
	}

	/**
	 * Records what the turn input carried, once the agent has accepted it. The
	 * SDK persists the input on receipt, so only from this point is a block
	 * actually in the conversation.
	 */
	async onInputAccepted(
		environment: AssistantTurnEnvironment,
		runtime: AssistantTurnInputRuntime,
		input: AssistantTurnInput,
		params: { user: User; threadId: string; runId: string },
	): Promise<void> {
		const { memory } = environment;
		const { instanceContext, aiPreferencesTurn } = input;
		const { user, threadId, runId } = params;
		// Advancing the cursor any earlier would let a failure between the two mark the opening
		// context as shown when it never was, and the next turn would send a delta against nothing.
		//
		// Best-effort on purpose. The cursor is an optimisation — losing it re-sends a window,
		// which is recoverable — so a metadata write must not fail the user's turn.
		if (instanceContext.state === 'injected') {
			const injectedCursor = instanceContext.cursor;
			try {
				await patchThread(memory, {
					threadId,
					update: ({ metadata }) => ({
						metadata: { ...metadata, [INSTANCE_CONTEXT_CURSOR]: injectedCursor },
					}),
				});
			} catch (error) {
				this.logger.warn('Failed to store the instance-context cursor', { error });
			}
		}

		// One frame for each turn that ran the preferences path — an empty payload says the
		// turn applied none, which is a different fact from no frame at all.
		if (aiPreferencesTurn) {
			runtime.eventBus.publish(threadId, {
				type: 'preferences-applied',
				runId,
				agentId: orchestratorAgentId(runId),
				userId: user.id,
				payload: aiPreferencesTurn.payload,
			});
		}
	}

	/**
	 * Setup panel v2 ground truth at run start: re-analyze the workflows this
	 * thread announced and tell the agent what is open and what the user
	 * completed since its previous look. Empty while the flag is off or the
	 * thread announced nothing. Best-effort: a failure never blocks the turn.
	 */
	private async buildWorkflowSetupStateBlock(context: InstanceAiContext): Promise<string> {
		const emitter = context.setupItemsEmitter;
		if (!emitter) return '';
		// Most recently announced first — that is the workflow the turn is about.
		const workflowIds = emitter.workflowIds().reverse();
		if (workflowIds.length === 0) return '';
		try {
			const note = formatWorkflowSetupStateNote(
				await observeWorkflowSetupStates(context, workflowIds),
			);
			return note
				? `${WORKFLOW_SETUP_STATE_OPEN_TAG}\n${note}\n${WORKFLOW_SETUP_STATE_CLOSE_TAG}`
				: '';
		} catch (error) {
			this.logger.warn('Failed to build the workflow setup state block', {
				threadId: context.threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return '';
		}
	}

	/**
	 * The bound project for the per-turn blocks, or undefined when it cannot be named
	 * (no bound project, no workspace adapter, a project we can't read).
	 *
	 * Best-effort by design: this is a guardrail, not a precondition. A run that cannot
	 * name its project should be a less-informed run, not a failed one - the write access is
	 * locked to the bound project either way.
	 */
	private async resolveBoundProject(
		context: InstanceAiContext,
	): Promise<ProjectSummary | undefined> {
		const projectId = context.projectId;
		if (!projectId) return undefined;

		// Read per turn, deliberately NOT cached. A cache keyed by project id has no
		// invalidation path here, so a renamed project would have the agent naming the
		// old name for the rest of the process's life — and naming the wrong project is
		// the failure this block exists to prevent.
		try {
			const project = await context.workspaceService?.getProject?.(projectId);
			if (project) return project;

			this.logger.warn('Assistant could not name the bound project for this turn', {
				projectId,
				reason: context.workspaceService?.getProject ? 'not-readable' : 'no-workspace-adapter',
			});
			return undefined;
		} catch (error) {
			this.logger.warn('Assistant failed to resolve the bound project for this turn', {
				projectId,
				error: error instanceof Error ? error.message : String(error),
			});
			this.errorReporter.error(error, {
				level: 'warning',
				tags: { component: 'instance-ai-project-context' },
				extra: { projectId },
				shouldIsolate: true,
			});
			return undefined;
		}
	}

	/**
	 * The saved AI preferences as this turn applies them: the block to inject, when the
	 * rendered text differs from the last block the conversation carries, and the payload
	 * the turn publishes either way. Reading the previous copy from the persisted messages
	 * instead of per-thread state means a block a failed turn never persisted is correctly
	 * absent, and an unchanged conversation carries exactly one copy.
	 *
	 * Best-effort like the project block: a failed read costs the preferences, not the
	 * turn — and reports an empty payload, which is an answer, not a missing one.
	 */
	private async resolveAiPreferencesTurn(
		userId: string,
		project: ProjectSummary | undefined,
		threadId: string,
		loadHistory: () => Promise<AgentDbMessage[]>,
	): Promise<{ block: string | undefined; payload: AiPreferencesAppliedPayload }> {
		const resolved = await this.bestEffort(
			'Assistant failed to read the AI preferences for this turn',
			{ userId },
			async () => {
				const preferences = await this.aiPreferenceService.getApplicable(
					userId,
					project ? [project] : [],
				);
				return { preferences, rendered: renderAiPreferencesBlock(preferences) };
			},
		);
		if (!resolved) {
			return {
				block: undefined,
				payload: { preferences: [], renderedLength: 0, injectedThisTurn: false },
			};
		}

		const history = await this.bestEffort(
			'Assistant failed to read the last AI preferences block of this thread',
			{ threadId },
			async () => await this.findAiPreferencesHistory(loadHistory),
		);
		const lastBlock = history?.block;
		const savedSinceLastBlock = history?.savedSinceLastBlock === true;

		// A save can be removed before any block carries it. Correct the saved tool result too.
		const { preferences, rendered } = resolved;
		const freshBlock =
			rendered ??
			(lastBlock !== undefined || savedSinceLastBlock ? AI_PREFERENCES_CLEARED_BLOCK : undefined);
		if (freshBlock === undefined) {
			return {
				block: undefined,
				payload: buildAppliedPreferencesPayload({
					preferences,
					renderedLength: 0,
					injectedThisTurn: false,
				}),
			};
		}

		if (
			!savedSinceLastBlock &&
			lastBlock !== undefined &&
			asStoredThreadContextSection(freshBlock) === lastBlock
		) {
			return {
				block: undefined,
				payload: buildAppliedPreferencesPayload({
					preferences,
					renderedLength: freshBlock.length,
					injectedThisTurn: false,
				}),
			};
		}

		return {
			block: freshBlock,
			payload: buildAppliedPreferencesPayload({
				preferences,
				renderedLength: freshBlock.length,
				injectedThisTurn: true,
			}),
		};
	}

	/**
	 * Find the latest visible block and successful saves after it.
	 * Scan the runtime's replay window. A compacted block is no longer visible, so
	 * current preferences must be injected again when the window has no block.
	 */
	private async findAiPreferencesHistory(
		loadHistory: () => Promise<AgentDbMessage[]>,
	): Promise<{ block?: string; savedSinceLastBlock: boolean }> {
		const history = await loadHistory();
		let savedSinceLastBlock = false;
		for (let i = history.length - 1; i >= 0; i--) {
			const m = history[i];
			if (!('role' in m)) continue;
			if (m.role === 'assistant' && Array.isArray(m.content)) {
				savedSinceLastBlock ||= m.content.some(
					(part) =>
						part.type === 'tool-call' &&
						part.toolName === 'save_user_preference' &&
						part.state === 'resolved' &&
						isRecord(part.output) &&
						part.output.ok === true,
				);
			}
			if (m.role !== 'user') continue;
			const block = extractAiPreferencesBlock(extractStoredMessageText(m.content));
			if (block !== undefined) return { block, savedSinceLastBlock };
		}
		return { savedSinceLastBlock };
	}

	/**
	 * The open tabs block for this turn, or `''` when the agent already has the same
	 * block in its replayed history. The agent reads the latest block as the current
	 * tabs, so an unchanged block is not sent again.
	 */
	private async resolveThreadArtifactsTurn(
		threadId: string,
		context: InstanceAiThreadArtifactsContext | undefined,
		attachments: InstanceAiResourceAttachment[],
		loadHistory: () => Promise<AgentDbMessage[]>,
	): Promise<string> {
		const freshBlock = buildThreadArtifactsBlock(context, attachments);
		if (!freshBlock) return '';
		// A hand-off always rides its own turn: the parser rebuilds the attachments from it.
		if (attachments.length > 0) return freshBlock;

		const history = await this.bestEffort(
			'Assistant failed to read the last thread artifacts block of this thread',
			{ threadId },
			async () => ({ block: await this.findLastThreadArtifactsBlock(loadHistory) }),
		);
		// Send the block when the history cannot be read, so the agent never has stale tabs.
		if (!history) return freshBlock;
		// A "no tabs" block is sent like any other: after compaction, an observation can
		// still say that tabs are open.
		return asStoredThreadContextSection(freshBlock) === history.block ? '' : freshBlock;
	}

	/** The latest thread artifacts block in the replay window, or `undefined`. */
	private async findLastThreadArtifactsBlock(
		loadHistory: () => Promise<AgentDbMessage[]>,
	): Promise<string | undefined> {
		const history = await loadHistory();
		for (let i = history.length - 1; i >= 0; i--) {
			const m = history[i];
			if (!('role' in m) || m.role !== 'user') continue;
			const block = extractThreadArtifactsBlock(extractStoredMessageText(m.content));
			if (block !== undefined) return block;
		}
		return undefined;
	}

	private async bestEffort<T>(
		failureMessage: string,
		context: Record<string, unknown>,
		step: () => T | Promise<T>,
	): Promise<Awaited<T> | undefined> {
		try {
			return await step();
		} catch (error) {
			this.logger.warn(failureMessage, { ...context, error: getErrorMessage(error) });
			return undefined;
		}
	}
}
