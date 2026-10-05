import { AgentEvent, createScopedWorkspace, filterRuntimeSkillSource } from '@n8n/agents';
import type {
	AgentDbMessage,
	CheckpointStore,
	JSONObject,
	Message,
	Workspace,
	ScopedMemoryTaskEvent,
	AgentEventData,
	MemoryTaskUsageReport,
} from '@n8n/agents';
import { getPromptWorkspaceRoot, getWorkspaceRoot } from '@n8n/agents/sandbox';
import {
	applyBranchReadOnlyOverrides,
	buildProxyHeaders,
	mcpConnectRequestSchema,
	credentialSetupHintSchema,
	formatAttachmentSizeLimit,
	TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
	type InstanceAiAttachment,
	type ComputerUseChannel,
	type InstanceAiBuildMode,
	type InstanceAiHandoffContext,
	type InstanceAiAgentAttachment,
	type InstanceAiFileAttachment,
	type InstanceAiNodesAttachment,
	type InstanceAiResourceAttachment,
	type InstanceAiWorkflowAttachment,
	type AiPreferencesAppliedPayload,
	type InstanceAiConfirmRequest,
	type InstanceAiCredits,
	type InstanceAiConfirmResponse,
	type InstanceAiEvent,
	type InstanceAiThreadStatusResponse,
	type InstanceContextReach,
	INSTANCE_CONTEXT_SURFACE_DEPTH,
	type InstanceAiEvalThreadMemoryResponse,
	type InstanceAiThreadArtifactsContext,
	type InstanceContextInjection,
} from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { SsrfProtectionService } from '@n8n/backend-network';
import { EventService, InstanceWriteAccessService, UrlService } from '@n8n/backend-services';
import {
	GlobalConfig,
	SsrfProtectionConfig,
	type AiConfig,
	type InstanceAiConfig,
} from '@n8n/config';
import { UserRepository, type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import {
	CONCISE_PROMPT_VERSION,
	MAX_STEPS,
	assertInstanceAiPromptVersion,
	createInstanceAgent,
	createLazyRuntimeWorkspace,
	createLazyWorkspaceRuntimeSkillSource,
	loadInstanceAiPromptSkills,
	resolvePromptProfile,
	describePromptProfile,
	setTracePromptVersion,
	setTraceModelId,
	modelConfigId,
	modelIdTraceMetadata,
	disabledInstanceAiSkillIds,
	createInstanceAiTraceContext,
	threadProvenanceMetadata,
	createInternalOperationTraceContext,
	emitAgentSnapshotTraceEvent,
	McpClientManager,
	createDomainAccessTracker,
	MemoryTaskRegistry,
	classifyAttachments,
	buildAttachmentManifest,
	getDateTimeSection,
	isParseableAttachment,
	isQuotaExhaustedError,
	PlannedTaskCoordinator,
	PlannedTaskStorage,
	PLANNED_TASK_PERMISSION_OVERRIDES,
	releaseTraceClient,
	RunStateRegistry,
	shutdownProductTelemetryProviders,
	tokenUsageToBuilderUsageItems,
	truncateToTitle,
	generateTitleForRun,
	patchThread,
	createOrchestratorRunControl,
	createSetupItemsEmitter,
	formatWorkflowSetupStateNote,
	isSetupPanelEnabled,
	observeWorkflowSetupStates,
	orchestratorAgentId,
	resolveAgentPreviewSession,
	saveAgentBuilderTarget,
	type DomainAccessTracker,
	type InstanceAiContext,
	type McpServerConfig,
	type ModelConfig,
	type AgentSnapshotArtifact,
	type OrchestrationContext,
	type InstanceAiTraceContext,
	type PlannedTaskGraph,
	type PlannedTaskRecord,
	type PlannedTaskService,
	type PlannedWorkflowVerification,
	type ServiceProxyConfig,
	type WorkflowBuildOutcome,
	type ProjectSummary,
	type WorkflowLoopWorkItemRecord,
	type WorkflowSetupRoutingClaim,
	type WorkflowTaskService,
	type WorkflowVerificationObligation,
	type WorkSummary,
	deriveInstanceContextReach,
	type RunTokenUsage,
	WorkflowTaskCoordinator,
	WorkflowLoopStorage,
	ThreadTaskStorage,
	AgentChunkPublisher,
	type SuspensionInfo,
} from '@n8n/instance-ai';
import { buildResumeData, toConfirmationData } from '@n8n/instance-ai/confirmation-payload';
import type { Scope } from '@n8n/permissions';
import { redactTelemetryProperties, redactTelemetryText, TELEMETRY_EVENT } from '@n8n/telemetry';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { isRecord } from '@n8n/utils/is-record';
import { lazyImport } from '@n8n/utils/lazy-import';
import { setSchemaBaseDirs } from '@n8n/workflow-sdk';
import { ErrorReporter } from 'n8n-core';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { N8N_VERSION, WORKFLOW_SDK_VERSION } from '@/constants';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { InstanceAiBuilderDelegateAdapterService } from '@/modules/agents/instance-ai-builder-delegate.adapter';
import { InstanceAiAgentContextAdapterService } from '@/modules/agents/instance-ai-agent-context.adapter';
import { modelStreamStallOptions } from '@/modules/agents/model-stream-stall-options';
import { userHasScopes } from '@/permissions.ee/check-access';
import { Push } from '@/push';
import {
	AI_PREFERENCES_CLEARED_BLOCK,
	AiPreferenceService,
	buildAppliedPreferencesPayload,
	renderAiPreferencesBlock,
} from '@/services/ai-preference.service';
import { AiUsageService } from '@/services/ai-usage.service';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { Telemetry } from '@/telemetry';

import { resolveAgentPreviewHandoff } from './agent-preview-handoff';
import {
	INSTANCE_CONTEXT_CURSOR,
	InstanceContextService,
	readInstanceContextCursor,
	toContextInjection,
	shouldTraceContextInjection,
} from './instance-context.service';
import { composeLocalMcpServers } from './browser/composite-local-mcp-server';
import { InstanceAiBrowserSessionService } from './browser/instance-ai-browser-session.service';
import { enabledToolCategories, resolveComputerUseState } from './computer-use-availability';
import { dropRejectedAttachmentsFromHistory } from './drop-rejected-attachments';
import { EvalThreadCredentialAllowlistService } from './eval/thread-credential-allowlist.service';
import { DurableEventLog } from './event-bus/durable-event-log';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { InstanceAiConversationHistoryService } from './instance-ai-conversation-history.service';
import { maskCreditsForDisplay } from './instance-ai-credit-display';
import { InstanceAiCreditService } from './instance-ai-credit.service';
import {
	getAgentErrorSeverity,
	InstanceAiErrorReporterService,
} from './instance-ai-error-reporter.service';
import { InstanceAiGatewayService } from './instance-ai-gateway.service';
import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiModelService } from './instance-ai-model.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiTemporaryWorkflowService } from './instance-ai-temporary-workflow.service';
import { InstanceAiTerminalOutcomeService } from './instance-ai-terminal-outcome.service';
import { InstanceAiAdapterService } from './instance-ai.adapter.service';
import {
	AUTO_FOLLOW_UP_MESSAGE,
	CREDENTIAL_CONTEXT_OPEN_TAG,
	CREDENTIAL_CONTEXT_CLOSE_TAG,
	asStoredThreadContextSection,
	cleanStoredUserMessage,
	buildCurrentDateTimeBlock,
	buildInstanceUrlsBlock,
	buildOnboardingSkillBlock,
	buildPastConversationsBlock,
	buildProjectContextBlock,
	buildThreadArtifactsBlock,
	buildThreadContextBlock,
	buildWorkflowTestRequestBlock,
	extractAiPreferencesBlock,
	extractThreadArtifactsBlock,
	getProjectContextSection,
	WORKFLOW_SETUP_STATE_CLOSE_TAG,
	WORKFLOW_SETUP_STATE_OPEN_TAG,
} from './internal-messages';
import { loadOnboardingSkill } from './onboarding';
import { ONBOARDING_OPENING } from './onboarding-opening';
import { InstanceAiMcpRegistryService } from './mcp';
import { runMetricsModelLabel } from './observability';
import {
	PlannedTaskActionRunner,
	type PlannedBuildFollowUp,
	type PlannedTaskDispatcher,
	type PlannedTaskFollowUpStarter,
	type PlannedTaskRunGate,
	type PlannedTaskRunScope,
	type PlannedTaskView,
	type PlannedWorkflowVerificationGate,
	type PlannedWorkflowVerificationTracker,
} from './planned-task-action-runner';
import { InstanceAiEventLogRepository } from './repositories/instance-ai-event-log.repository';
import {
	ASSISTANT_AGENT_ID,
	ASSISTANT_TURN_DEFAULTS_KEY,
	ASSISTANT_TURN_METADATA_KEY,
	LIVE_RUN_METADATA_KEY,
	readAssistantTurnOptions,
	toJsonObject,
	type AssistantTurnDefaults,
	type AssistantTurnOptions,
} from './assistant-turn-options';
import { N8nMemory, type N8nMemoryImpl } from '../agents/integrations/n8n-memory';
import { N8NCheckpointStorage } from '../agents/integrations/n8n-checkpoint-storage';
import { AgentExecutionThreadRepository } from '../agents/repositories/agent-execution-thread.repository';
import { AgentThreadGrantRepository } from '../agents/repositories/agent-thread-grant.repository';
import { SystemAgentExecutionService } from '../agents/system-agents/system-agent-execution.service';
import type {
	SystemAgentTurn,
	SystemAgentTurnHandle,
	SystemAgentTurnOutcome,
} from '../agents/system-agents/system-agent.types';
import { InstanceAiSandboxService, type RuntimeSandboxEntry } from './sandbox';
import { DbIterationLogStorage } from './storage/db-iteration-log-storage';
import { isStreamTransportError } from './stream-transport-error';
import {
	InstanceAiTracingService,
	type MessageTraceFinalization,
	type OrchestratorResumeReason,
} from './tracing';
import { WorkflowVerificationObligationService } from './workflow-verification-obligation-service';
import { WorkflowVerificationTaskProjector } from './workflow-verification-task-projector';
import { AgentExecutionService } from '../agents/agent-execution.service';
import { formatPreviewSessionContext } from '../agents/builder/format-preview-context';

/**
 * A resource attachment as the trace records it: the reference, not its contents.
 */
/** Workflow/agent attachments carry a display name; a nodes attachment doesn't. */
function isNamedResourceAttachment(
	attachment: InstanceAiResourceAttachment,
): attachment is InstanceAiWorkflowAttachment | InstanceAiAgentAttachment {
	return attachment.type !== 'nodes' && Boolean(attachment.name);
}

function buildHandoffContextBlock(context: InstanceAiHandoffContext | undefined): string {
	if (!context || context.source !== 'credential-modal') return '';

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

const WORKFLOW_SETUP_ROUTING_CLAIM_TTL_MS = 15 * 60 * 1000;

function isSandboxEndpointNotAllowedError(error: unknown): boolean {
	return getErrorMessage(error).toLowerCase().includes('endpoint not allowed');
}

function isStaleResumeError(error: unknown): boolean {
	// Name check instead of instanceof: the class crosses the @n8n/agents package boundary.
	return error instanceof Error && error.name === 'StaleResumeError';
}

/** Signals that the failure is about an attached file rather than the request as a whole. */
const ATTACHMENT_SUBJECT_PATTERN = /image|attachment/;

/** Signals that the attachment was refused for its size/decodability, not merely mentioned. */
const ATTACHMENT_REFUSAL_PATTERN = /exceed|too large|maximum|max allowed|could not process/;

/**
 * Every scrap of message text reachable from an error, following `cause` chains,
 * arrays (an aggregate of stream failures) and the message-bearing fields the AI
 * SDK hangs the provider's response on.
 *
 * Needed because the terminal error is the ai-sdk's `AI_NoOutputGeneratedError`
 * wrapper: the provider's actual refusal is nested underneath it, and a plain
 * `error.message` check sees only "No output generated".
 */
function collectErrorText(value: unknown, depth = 0): string[] {
	if (depth > 4 || value === null || value === undefined) return [];
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap((item) => collectErrorText(item, depth + 1));
	if (value instanceof Error) {
		return [value.message, ...collectErrorText(Reflect.get(value, 'cause'), depth + 1)];
	}
	if (typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return ['message', 'error', 'responseBody', 'data', 'cause', 'errors'].flatMap((key) =>
			collectErrorText(record[key], depth + 1),
		);
	}
	return [];
}

/**
 * True when the provider refused an attached file outright. Both signals must be
 * present: matching on the subject alone would misclassify unrelated failures that
 * happen to mention an image.
 *
 * Matched on the message text because the provider surfaces this as a plain 400
 * with no machine-readable discriminator. `validateAttachmentSizes` rejects the
 * known cases before the request is built, so this is the net for provider-side
 * limits we don't model (pixel dimensions, per-provider ceilings, format quirks) —
 * without it, such a rejection sticks in thread history and fails every later turn.
 */
export function isAttachmentRejectedByProviderError(error: unknown): boolean {
	const haystack = [getErrorMessage(error), ...collectErrorText(error)].join(' ').toLowerCase();
	return ATTACHMENT_SUBJECT_PATTERN.test(haystack) && ATTACHMENT_REFUSAL_PATTERN.test(haystack);
}

/**
 * Shown when the user has exhausted their AI credits/quota. Self-contained so it
 * still reads clearly on older clients that don't render the structured
 * `quota_exhausted` error state; kept in sync with the FE i18n copy.
 */
export const QUOTA_EXHAUSTED_USER_MESSAGE =
	"You've run out of AI credits. Upgrade your plan to continue using the n8n Assistant.";

const OPERATIONAL_ERROR_USER_MESSAGE =
	'I hit an operational error before I could finish that response. Please try again.';

const GENERIC_ERROR_USER_MESSAGE =
	'Something went wrong before I could finish that response. Please try again.';

/** Structured error code for the UI when a run failed because credits ran out. */
function getUserFacingErrorCode(error: unknown): 'quota_exhausted' | undefined {
	return isQuotaExhaustedError(error) ? 'quota_exhausted' : undefined;
}

/** `fallback` lets a caller name what specifically failed when the error itself
 *  carries no user-facing meaning. */
export function getUserFacingErrorMessage(
	error: unknown,
	fallback: string = GENERIC_ERROR_USER_MESSAGE,
	opts: {
		/**
		 * Whether the refused attachment was actually removed from thread history.
		 * `false` means the thread still replays it, so the guidance must send the user
		 * to a new conversation rather than promise a clean slate.
		 */
		attachmentRemoved?: boolean;
	} = {},
): string {
	if (isQuotaExhaustedError(error)) {
		return QUOTA_EXHAUSTED_USER_MESSAGE;
	}

	if (isStreamTransportError(error)) {
		return 'The connection to the AI provider dropped before I could finish that response. Please try again.';
	}

	if (error instanceof UserError) {
		return error.message;
	}

	if (isStaleResumeError(error)) {
		return "This approval was already handled. If the assistant isn't responding, send a new message to continue.";
	}

	if (isSandboxEndpointNotAllowedError(error)) {
		return "I couldn't finish preparing the workspace sandbox. Please try again in a moment.";
	}

	// Deliberately no "try again": retrying replays the same attachment. Wording stays
	// generic because PDFs and spreadsheets get refused too, and the size hint is only
	// offered when the error actually says so — the provider's text is usually
	// unavailable here, and guessing "too large" would misdirect the user.
	if (opts.attachmentRemoved !== undefined || isAttachmentRejectedByProviderError(error)) {
		const sizeAdvice = isAttachmentRejectedByProviderError(error)
			? ` Keep it under ${formatAttachmentSizeLimit()}, and for images no more than 8000x8000 pixels.`
			: '';

		return opts.attachmentRemoved === false
			? 'I could not read one of the attached files, and I could not remove it from this ' +
					`conversation either. Start a new chat and attach it again.${sizeAdvice}`
			: 'I could not read one of the attached files, so I left it out. Attach it again — ' +
					`ideally a smaller version.${sizeAdvice}`;
	}

	if (error instanceof OperationalError) {
		return OPERATIONAL_ERROR_USER_MESSAGE;
	}

	return fallback;
}

/**
 * Masked terminal failures whose real cause is unrecoverable from the error
 * object: the ai-sdk's flush wrapper when zero steps were recorded (created
 * without `cause`), and undici's `TypeError: terminated` when the upstream
 * connection is killed mid-stream. When the credit wall hits at the model call
 * instead of the token endpoint, the run dies with one of these rather than a
 * classified quota error — see `reclassifyMaskedStreamFailure`.
 */
export function isMaskedStreamFailure(error: unknown): error is Error {
	if (!(error instanceof Error)) return false;
	if (error.name === 'AI_NoOutputGeneratedError') return true;
	return error.name === 'TypeError' && error.message === 'terminated';
}

/** Error codes reported by the browser tool wrapper for failures that happen
 *  before credential persistence (capturing/resolving secrets in the browser). */
const GENERATION_STAGE_ERROR_CODES = new Set([
	'missing_captured_fields',
	'unresolved_field',
	'gateway_context_missing',
]);

function failureStageForErrorCode(
	errorCode: string | undefined,
): 'generation' | 'persistence' | 'unknown' {
	if (errorCode && GENERATION_STAGE_ERROR_CODES.has(errorCode)) return 'generation';
	if (errorCode === 'credential_create_failed') return 'persistence';
	return 'unknown';
}

/**
 * Substituted for a masked stream failure once the credit re-check confirms
 * the user is out of credits. Carries the machine-readable quota code so the
 * run is classified exactly like a quota error surfaced by the proxy (credits
 * message + structured `errorCode`, not reported to Sentry), and keeps the
 * masked original as `cause` for tracing and telemetry.
 */
export class QuotaExhaustedStreamError extends UserError {
	readonly errorCode = 'quota_exhausted';

	constructor(maskedError: Error) {
		super(`AI credits exhausted (${maskedError.name}: ${maskedError.message})`, {
			cause: maskedError,
		});
	}
}

function createInertAbortSignal(): AbortSignal {
	return new AbortController().signal;
}

/** Error details for the 'Builder generation errored' telemetry event. */
type RunFinishErrorInfo = {
	/** Raw error message — the SSE run-finish payload carries the user-facing reason instead. */
	errorMessage?: string;
	/** 'stream' = the run reported an error but terminated cleanly; 'exception' = the run loop threw. */
	errorSource?: 'stream' | 'exception';
};

type RunFinishMetadata = RunFinishErrorInfo & {
	promptVersion?: string;
	modelId?: ModelConfig;
	/** How far the turn went for instance context, for the trace to complete its entry. */
	contextReach?: InstanceContextReach;
};

/** Root-run outputs for a suspended segment — keep the LangSmith turn readable (AGENT-371). */
function buildSuspensionTraceOutputs(runId: string, suspension: SuspensionInfo | undefined) {
	const rawMessage = suspension?.suspendPayload.message;
	const message = typeof rawMessage === 'string' && rawMessage ? rawMessage : undefined;
	return {
		status: 'suspended',
		runId,
		...(suspension?.requestId ? { requestId: suspension.requestId } : {}),
		...(suspension?.toolCallId ? { pendingToolCallId: suspension.toolCallId } : {}),
		...(suspension?.toolName ? { toolName: suspension.toolName } : {}),
		...(message ? { message } : {}),
	};
}

function isTextMessagePart(part: unknown): part is { type: 'text'; text: string } {
	return (
		typeof part === 'object' &&
		part !== null &&
		'type' in part &&
		part.type === 'text' &&
		'text' in part &&
		typeof part.text === 'string'
	);
}

/** Planned tasks the scheduler may start in one tick. */
const MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD = 5;

/** The finished build task a workflow-verification follow-up reports on. */
type WorkflowVerificationSourceTask = {
	taskId: string;
	role: string;
	status: 'completed';
	result?: string;
	error?: string;
	plannedTaskId?: string;
	workItemId?: string;
};

/**
 * Circuit breaker for machine-started follow-up runs (verification, synthesize,
 * replan, …). A follow-up that dies before the agent can settle its trigger
 * (e.g. sandbox setup fails on an exhausted quota) would otherwise be re-armed
 * by its own post-run scheduler tick, producing an unbounded error loop.
 */
const MAX_CONSECUTIVE_FAILED_INTERNAL_FOLLOW_UPS = 3;

const TITLE_REFINE_HISTORY_LIMIT = 50;

/** Bind identity, gate results, and injection once for all segments of a turn. */
type InstanceContextTurnBinding = {
	userId: string;
	threadId: string;
	runId: string;
	injection: InstanceContextInjection;
	instanceContextEnabled: boolean;
	nodeUsageEnabled: boolean;
};

type InstanceContextGates = Pick<
	InstanceContextTurnBinding,
	'instanceContextEnabled' | 'nodeUsageEnabled'
>;

/** The built orchestrator agent type returned by `createInstanceAgent`. */
type InstanceAgent = Awaited<ReturnType<typeof createInstanceAgent>>['agent'];

/**
 * Normalises `N8N_INSTANCE_AI_PROMPT_VERSION`. Blank and absent both mean "no
 * pin" and must become `undefined`: passing `''` on to `resolvePromptProfile`
 * would report a fallback from an empty version instead of a clean default
 * selection.
 *
 * An unknown version throws, so a typo fails the run loudly rather than
 * silently serving the default profile. Resolved at the point of use, not
 * cached at construction: a module `init()` that throws takes the whole n8n
 * process down with it, and an optional Instance AI pin must not cost the
 * instance its webhooks and executions.
 */
export function resolveOperatorPromptVersion(configured: string | undefined): string | undefined {
	const version = configured?.trim();
	if (!version) return undefined;
	assertInstanceAiPromptVersion(version);
	return version;
}

@Service()
export class InstanceAiService {
	private _mcpClientManager?: McpClientManager;
	private readonly _ssrfProtectionConfig: SsrfProtectionConfig;
	private readonly _ssrfProtectionService: SsrfProtectionService;
	private get mcpClientManager(): McpClientManager {
		if (!this._mcpClientManager) {
			this._mcpClientManager = new McpClientManager(
				this._ssrfProtectionConfig.enabled ? this._ssrfProtectionService : undefined,
				{ onToolCallSettled: (event) => this.trackMcpToolCall(event) },
			);
		}
		return this._mcpClientManager;
	}

	private readonly instanceAiConfig: InstanceAiConfig;

	private readonly aiConfig: AiConfig;

	private readonly oauth2CallbackUrl: string;

	private readonly webhookBaseUrl: string;

	private readonly formBaseUrl: string;

	private readonly runState = new RunStateRegistry();

	private readonly memoryTaskRegistry = new MemoryTaskRegistry();

	/** Owns the LangSmith trace-context lifecycle for orchestration runs. */
	private readonly tracing: InstanceAiTracingService;

	/** Owns the per-thread runtime sandbox/workspace lifecycle. */
	private readonly sandboxService: InstanceAiSandboxService;

	/** Domain-access trackers per thread — persists approvals across runs within a conversation. */
	private readonly domainAccessTrackersByThread = new Map<string, DomainAccessTracker>();

	/** Tracks the iframe pushRef per thread for live execution push events. */
	private readonly threadPushRef = new Map<string, string>();

	/**
	 * Runs where the credentials tool handed off to browser-assisted credential
	 * setup (`needsBrowserSetup`), keyed by runId with one record per setup
	 * attempt (a run can attempt several). Resolved to one terminal
	 * success/failure telemetry event per attempt in `publishRunFinish`.
	 * Entries exist only between the hand-off and the run's terminal event.
	 */
	private readonly pendingBrowserCredentialSetups = new Map<
		string,
		{
			userId: string;
			attempts: Array<{
				credentialType: string;
				setupMethod: 'setup_card' | 'conversation';
				attemptId?: string;
				startedAt: number;
				created: boolean;
				errorCode?: string;
			}>;
		}
	>();

	/** Counts plan-review confirmations per thread, to tell the first plan apart from later revisions. */
	private readonly planRequestsByThread = new Map<string, number>();

	/** Per-thread promise chain that serializes schedulePlannedTasks calls. */
	private readonly schedulerLocks = new Map<string, Promise<void>>();

	/**
	 * Consecutive machine-started follow-up runs that errored, per thread.
	 * Gates `startInternalFollowUpRun` so a follow-up whose run keeps failing
	 * (its trigger left unsettled) cannot re-arm itself forever; reset by any
	 * run that completes or suspends, i.e. proves the thread is healthy again.
	 */
	private readonly failedInternalFollowUpStreaks = new Map<string, number>();

	private readonly terminalOutcome: InstanceAiTerminalOutcomeService;

	/** Default IANA timezone for the instance (from GENERIC_TIMEZONE env var). */
	private readonly defaultTimeZone: string;

	private readonly logger: Logger;

	private readonly workflowObligations: WorkflowVerificationObligationService;

	private readonly taskProjector: WorkflowVerificationTaskProjector;

	constructor(
		logger: Logger,
		globalConfig: GlobalConfig,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly eventBus: InProcessEventBus,
		private readonly eventLog: DurableEventLog,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly gatewayService: InstanceAiGatewayService,
		private readonly browserSessionService: InstanceAiBrowserSessionService,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly aiService: AiService,
		private readonly threadGrantRepo: AgentThreadGrantRepository,
		private readonly urlService: UrlService,
		private readonly eventLogRepository: InstanceAiEventLogRepository,
		private readonly dbIterationLogStorage: DbIterationLogStorage,
		private readonly instanceWriteAccess: InstanceWriteAccessService,
		private readonly telemetry: Telemetry,
		private readonly mcpRegistryService: InstanceAiMcpRegistryService,
		private readonly userRepository: UserRepository,
		private readonly temporaryWorkflowService: InstanceAiTemporaryWorkflowService,
		private readonly errorReporter: ErrorReporter,
		ssrfProtectionConfig: SsrfProtectionConfig,
		ssrfProtectionService: SsrfProtectionService,
		private readonly eventService: EventService,
		private readonly evalCredentialAllowlists: EvalThreadCredentialAllowlistService,
		private readonly modelService: InstanceAiModelService,
		private readonly creditService: InstanceAiCreditService,
		private readonly instanceAiErrorReporter: InstanceAiErrorReporterService,
		private readonly push: Push,
		private readonly conversationHistoryService: InstanceAiConversationHistoryService,
		private readonly instanceContext: InstanceContextService,
		private readonly aiPreferenceService: AiPreferenceService,
		private readonly aiUsageService: AiUsageService,
	) {
		this.logger = logger.scoped('instance-ai');
		this.workflowObligations = new WorkflowVerificationObligationService(
			this.agentMemory,
			(threadId) => this.runState.isSetupPanelEnabled(threadId),
		);
		this.taskProjector = new WorkflowVerificationTaskProjector(
			this.agentMemory,
			this.eventBus,
			this.logger,
			this.workflowObligations,
		);
		this.instanceAiConfig = globalConfig.instanceAi;
		this.aiConfig = globalConfig.ai;
		this.tracing = new InstanceAiTracingService({
			logger: this.logger,
			// `first_visible_state` has to see the run's streamed text, which lives
			// in the log as coalesced blocks — the bus retains nothing.
			eventReader: {
				getEventsForRun: async (threadId, runId) => await this.readRunEvents(threadId, [runId]),
			},
			eventLog: this.eventLogRepository,
			aiService: this.aiService,
		});
		this.sandboxService = new InstanceAiSandboxService({
			config: this.instanceAiConfig,
			logger: this.logger,
			errorReporter: this.errorReporter,
			settingsService: this.settingsService,
			aiService: this.aiService,
			resolveTracingConfig: async (threadId, userId) => {
				const ownerId = userId ?? (await this.agentMemory.getThread(threadId))?.resourceId;
				if (!ownerId) return { userId: 'system' };
				const { tracingProxyConfig } = await this.createProxyRunConfig({ id: ownerId });
				return { userId: ownerId, proxyConfig: tracingProxyConfig };
			},
		});
		this.terminalOutcome = new InstanceAiTerminalOutcomeService({
			// The terminal guard and outcome-replay dedup must see the run's events
			// after a restart too, which only the durable log can provide (the bus
			// cache is empty in a fresh process).
			eventBus: {
				publish: (threadId, event) => this.eventBus.publish(threadId, event),
				getEventsForRun: async (threadId, runId) => await this.readRunEvents(threadId, [runId]),
				getEventsForRuns: async (threadId, runIds) => await this.readRunEvents(threadId, runIds),
			},
			telemetry: this.telemetry,
			errorReporter: this.instanceAiErrorReporter,
			logger: this.logger,
			runState: this.runState,
		});
		this.defaultTimeZone = globalConfig.generic.timezone;
		const restEndpoint = globalConfig.endpoints.rest;
		this.oauth2CallbackUrl = `${this.urlService.getInstanceBaseUrl()}/${restEndpoint}/oauth2-credential/callback`;
		this.webhookBaseUrl = `${this.urlService.getWebhookBaseUrl()}${globalConfig.endpoints.webhook}`;
		this.formBaseUrl = `${this.urlService.getWebhookBaseUrl()}${globalConfig.endpoints.form}`;

		this._ssrfProtectionConfig = ssrfProtectionConfig;
		this._ssrfProtectionService = ssrfProtectionService;

		// Runtime clients capture provider settings at creation, so rebuild them
		// after admin settings change. In-flight sandbox users retain their entry.
		this.eventService.on('instance-ai-settings-updated', ({ mcpSettingsChanged }) => {
			this.sandboxService.invalidateCachedWorkspaces();
			if (!mcpSettingsChanged) return;
			if (!this._mcpClientManager) return;
			this._mcpClientManager.disconnect().catch((error: unknown) => {
				this.logger.warn('Failed to disconnect MCP clients after settings change', {
					error: getErrorMessage(error),
				});
			});
		});
	}

	private async createProxyRunConfig(user: Pick<User, 'id'>): Promise<{
		searchProxyConfig?: ServiceProxyConfig;
		tracingProxyConfig?: ServiceProxyConfig;
		tokenManager?: ProxyTokenManager;
		proxyBaseUrl?: string;
	}> {
		if (!this.aiService.isProxyEnabled()) return {};

		const client = await this.aiService.getClient();
		const proxyBaseUrl = client.getApiProxyBaseUrl();
		const tokenManager = new ProxyTokenManager(async () => {
			return await client.getInstanceAiApiProxyToken({ id: user.id }, { userMessageId: nanoid() });
		});
		const featureHeaders = buildProxyHeaders({
			feature: 'instance-ai',
			n8nVersion: N8N_VERSION,
		});

		return {
			proxyBaseUrl,
			tokenManager,
			searchProxyConfig: {
				apiUrl: proxyBaseUrl + '/brave-search',
				getAuthHeaders: async () => ({
					...(await tokenManager.getAuthHeaders()),
					...featureHeaders,
				}),
			},
			tracingProxyConfig: {
				apiUrl: proxyBaseUrl + '/langsmith',
				getAuthHeaders: async () => ({
					...(await tokenManager.getAuthHeaders()),
					...featureHeaders,
				}),
			},
		};
	}

	/**
	 * Full model-resolver chain shared between chat and eval paths. Delegates to
	 * the model service so the eval endpoint gets the same working model the chat
	 * endpoint uses.
	 */
	async resolveAgentModelConfig(user: User): Promise<ModelConfig> {
		return await this.modelService.resolveAgentModelConfig(user);
	}

	/**
	 * Read the user's persisted "always allow" grants for a thread (keys like `executions:run`).
	 * Persisted in `instance_ai_thread_grants` so they survive reload/navigation and are visible
	 * across mains. Returns an empty set on any read error — a missing grant just re-asks, which
	 * is safe.
	 */
	private async loadThreadSessionGrants(threadId: string, _userId: string): Promise<Set<string>> {
		try {
			return await this.threadGrantRepo.findKeys(threadId);
		} catch (error) {
			this.logger.warn('Failed to load Instance AI session grants', {
				threadId,
				error: getErrorMessage(error),
			});
			return new Set();
		}
	}

	/**
	 * Persist a per-user, thread-level "always allow" grant. Idempotent across mains via the
	 * composite PK. Best-effort — a failed write just means the user is re-asked next run.
	 */
	private async persistThreadSessionGrant(
		threadId: string,
		_userId: string,
		key: string,
	): Promise<void> {
		try {
			await this.threadGrantRepo.grant(threadId, key);
		} catch (error) {
			this.logger.warn('Failed to persist Instance AI session grant', {
				threadId,
				key,
				error: getErrorMessage(error),
			});
		}
	}

	/**
	 * Drop a per-user, thread-level grant. Used by decisions that are meant to be reversible
	 * within a thread — e.g. the user skipped a credential's setup, then later asks for it.
	 * Best-effort: a failed delete leaves the decision in place until the next run.
	 */
	private async revokeThreadSessionGrant(
		threadId: string,
		_userId: string,
		key: string,
	): Promise<void> {
		try {
			await this.threadGrantRepo.revoke(threadId, key);
		} catch (error) {
			this.logger.warn('Failed to revoke Instance AI session grant', {
				threadId,
				key,
				error: getErrorMessage(error),
			});
		}
	}

	/** Whether the AI service proxy is enabled for credit counting. */
	isProxyEnabled(): boolean {
		return this.modelService.isProxyEnabled();
	}

	/**
	 * Get current credit usage from the AI service proxy.
	 *
	 * Doubles as the reconcile point for the activation lock: this runs on every page load, so a
	 * lock call that was lost to a failed request, an evicted record or a process restart is
	 * re-asserted here without any scheduled job.
	 */
	async getCredits(user: User): Promise<InstanceAiCredits> {
		await this.creditService.ensureQuotaLockApplied(user);

		const credits = await this.modelService.getCredits(user);
		return maskCreditsForDisplay(credits, this.settingsService.isActivationCapped());
	}

	/**
	 * When the credit wall hits at the model call (rather than the token
	 * endpoint at sandbox start), the proxy failure surfaces as a masked
	 * generic error. For those signatures, re-check the user's remaining
	 * credits and substitute a quota-exhausted error so the run resolves to
	 * the credits message instead of a generic failure. Best-effort: any
	 * re-check failure keeps the original error, so genuinely unexplained
	 * stream deaths stay visible.
	 */
	/**
	 * Whether this run died because the provider refused an attachment.
	 *
	 * The terminal error is frequently the ai-sdk's masked wrapper
	 * (`AI_NoOutputGeneratedError`), which carries none of the provider's text — the
	 * refusal reaches us as a stream `error` event instead. Checking the run's own
	 * events is what makes the recovery fire on the path that actually occurs;
	 * classifying the terminal error alone silently misses it.
	 */
	/**
	 * Whether a failed turn's attachments should be dropped from thread history.
	 *
	 * Deliberately *not* based on the provider's error text. That text is
	 * unreachable by the time a run ends: the terminal error is an
	 * `AI_NoOutputGeneratedError` wrapper whose `cause` is undefined, the agent's own
	 * error events carry the same wrapper, and the error event holding the provider
	 * message is not published until after the terminal handler has run. Matching on
	 * it looks correct in unit tests and silently never fires in production.
	 *
	 * So key off what is knowable: this turn carried files, and it ended without
	 * producing output. That is exactly the shape that strands a thread — the
	 * attachment is already persisted, so every later turn replays it and dies the
	 * same way. Dropping it on an unrelated transient failure is the acceptable
	 * trade: the user is told, and re-attaching costs one message. Leaving it risks
	 * a conversation that can never recover.
	 */
	/**
	 * Translate a cleanup outcome into the `attachmentRemoved` hint the message
	 * formatter takes. `undefined` means "say nothing about attachments" — a thread
	 * that held none must not be told its attachment could not be removed.
	 */
	private async dropTurnAttachments(args: {
		threadId: string;
		resourceId: string;
	}): Promise<boolean | undefined> {
		const outcome = await dropRejectedAttachmentsFromHistory(
			this.agentMemory,
			{ threadId: args.threadId, resourceId: args.resourceId },
			this.logger,
		);
		if (outcome === 'no-attachments') return undefined;
		return outcome === 'removed';
	}

	private shouldDropTurnAttachments(args: {
		/**
		 * Whether this turn introduced files. Unknown on a resumed run — it replays
		 * history rather than accepting new input — so callers there pass `true` and
		 * rely on `dropRejectedAttachmentsFromHistory` no-opping when the thread holds
		 * no inline files.
		 */
		turnHadAttachments: boolean;
		producedNoOutput: boolean;
	}): boolean {
		return args.turnHadAttachments && args.producedNoOutput;
	}

	private async reclassifyMaskedStreamFailure(
		error: unknown,
		user: User,
		context: { threadId: string; runId: string },
	): Promise<unknown> {
		if (!isMaskedStreamFailure(error)) return error;
		try {
			const { creditsQuota, creditsClaimed, quotaLocked } =
				await this.modelService.getCredits(user);
			// The activation lock refuses use while the quota still has credits left, so the numbers
			// alone wouldn't explain the failure. Read from the proxy, not from n8n's own trigger
			// state: that only says the lock *should* apply, so a lock call that failed would turn
			// any unrelated stream death into a spurious upgrade wall.
			if (!quotaLocked && (creditsQuota < 0 || creditsClaimed < creditsQuota)) return error;
		} catch (creditsError) {
			this.logger.debug('Masked stream failure credit re-check failed; keeping original error', {
				error: getErrorMessage(creditsError),
				...context,
			});
			return error;
		}
		this.logger.info('Reclassified masked stream failure as quota-exhausted', {
			maskedError: getErrorMessage(error),
			...context,
		});
		return new QuotaExhaustedStreamError(error);
	}

	isEnabled(): boolean {
		return this.settingsService.isAgentEnabled() && !!this.instanceAiConfig.model;
	}

	/** The live turn of a thread, read from the Agents tables. Correct on every main. */
	async getLiveRun(threadId: string): Promise<{
		status: 'running' | 'suspended' | 'idle';
		runId?: string;
		messageGroupId?: string;
		runIds: string[];
	}> {
		const thread = await this.systemAgents.findThread(threadId);
		if (!thread) return { status: 'idle', runIds: [] };
		const { status } = await this.systemAgents.getStatus(thread);
		const memoryThread = await this.assistantMemory.getThread(threadId);
		const live = memoryThread?.metadata?.[LIVE_RUN_METADATA_KEY];
		if (status === 'idle' || !isRecord(live) || typeof live.runId !== 'string') {
			return { status, runIds: [] };
		}
		return {
			status,
			runId: live.runId,
			...(typeof live.messageGroupId === 'string' ? { messageGroupId: live.messageGroupId } : {}),
			runIds: Array.isArray(live.runIds)
				? live.runIds.filter((id): id is string => typeof id === 'string')
				: [live.runId],
		};
	}

	async hasActiveRun(threadId: string): Promise<boolean> {
		return (await this.getLiveRun(threadId)).status !== 'idle';
	}

	async getThreadStatus(threadId: string): Promise<InstanceAiThreadStatusResponse> {
		const live = await this.getLiveRun(threadId);
		const memoryTasks = this.memoryTaskRegistry.getTasks(threadId);
		const selectedPrompt = this.runState.getPromptConfiguration(threadId);
		return {
			hasActiveRun: live.status === 'running',
			isSuspended: live.status === 'suspended',
			...(live.runId ? { runId: live.runId } : {}),
			backgroundTasks: [],
			memoryTasks,
			...(selectedPrompt ? { promptConfiguration: selectedPrompt } : {}),
		};
	}

	private memoryTaskObserverFor(
		threadId: string,
		tracing: InstanceAiTraceContext | undefined,
	): (event: ScopedMemoryTaskEvent) => void {
		return (event) => {
			// Retains/releases the trace's telemetry provider lease so the
			// task's LLM span can still export after the root trace finalizes
			// (see InstanceAiTraceContext.onMemoryTaskEvent).
			tracing?.onMemoryTaskEvent?.(event);
			this.memoryTaskRegistry.handleEvent(threadId, event);
			const pendingTasks = this.memoryTaskRegistry.getTasks(threadId);
			const logContext = {
				threadId,
				taskId: event.task.id,
				taskKind: event.task.taskKind,
				pendingCount: pendingTasks.length,
				...(event.type === 'skipped' ? { reason: event.reason } : {}),
				...(event.type === 'failed' ? { error: getErrorMessage(event.error) } : {}),
				...(event.type === 'completed' &&
				event.value &&
				typeof event.value === 'object' &&
				'status' in event.value &&
				typeof event.value.status === 'string'
					? { outcome: event.value.status }
					: {}),
			};
			this.logger.info(`Observational memory task ${event.type}`, logContext);
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

	/** What observational memory holds for a thread: the live observations and the
	 *  compaction cursor. An eval asserts on these rows instead of parsing the
	 *  rendered system prompt. Refuses a thread the caller does not own, so the
	 *  check does not depend on the route. */
	async getThreadMemory(
		userId: string,
		threadId: string,
	): Promise<InstanceAiEvalThreadMemoryResponse> {
		const thread = await this.systemAgents.findThread(threadId);
		if (!thread || thread.ownerId !== userId) {
			throw new ForbiddenError('Not authorized for this thread');
		}
		const [observations, cursor] = await Promise.all([
			this.agentMemory.getObservationLog({ observationScopeId: threadId, status: 'active' }),
			this.agentMemory.getCursor(threadId),
		]);
		return {
			observations: observations.map(({ marker, text, tokenCount }) => ({
				marker,
				text,
				tokenCount,
			})),
			cursor: cursor && {
				lastObservedMessageId: cursor.lastObservedMessageId,
				lastObservedAt: cursor.lastObservedAt.toISOString(),
			},
		};
	}

	clearTraceContextsForTest(): void {
		this.tracing.clearTraceContextsForTest();
	}

	async submitLangsmithFeedback(
		user: User,
		threadId: string,
		responseId: string,
		payload: { rating: 'up' | 'down'; comment?: string },
	): Promise<void> {
		await this.tracing.submitLangsmithFeedback(user, threadId, responseId, payload);
	}

	/** Queue a user message. The Agents runtime runs it, or steers it into the running turn. */
	async startRun(
		user: User,
		threadId: string,
		message: string,
		attachments?: InstanceAiAttachment[],
		context?: InstanceAiHandoffContext,
		timeZone?: string,
		pushRef?: string,
		mode?: InstanceAiBuildMode,
		promptVersion?: string,
		computerUseChannels?: ComputerUseChannel[],
		threadArtifacts?: InstanceAiThreadArtifactsContext,
		observerThresholdTokens?: number,
	): Promise<string> {
		if (
			promptVersion !== undefined &&
			resolvePromptProfile({ version: promptVersion }).fallbackFrom
		) {
			throw new BadRequestError(`Unknown Instance AI prompt version "${promptVersion}"`);
		}
		const { runId } = await this.enqueueAssistantTurn(user, threadId, message, {
			runId: `run_${nanoid()}`,
			messageGroupId: `mg_${nanoid()}`,
			timeZone,
			pushRef,
			buildMode: mode,
			promptVersion,
			computerUseChannels,
			observerThresholdTokens,
			attachments,
			handoffContext: context,
			threadArtifacts,
		});
		return runId;
	}

	/** Clean up planned work that a stopped thread leaves behind. */
	cancelRun(threadId: string, _reason = 'user_cancelled'): void {
		// The user stopped before approving. A persisted awaiting-approval plan
		// would republish its stale checklist on every scheduler pass.
		void this.cancelAwaitingApprovalPlan(threadId);
	}

	/** Stop the running turn, or cancel the suspended one. Works from any main. */
	async routeCancelRun(user: User, threadId: string): Promise<void> {
		const thread = await this.systemAgents.getThread(ASSISTANT_AGENT_ID, user, threadId);
		const status = await this.systemAgents.getStatus(thread);
		this.cancelRun(threadId);
		await this.systemAgents.cancel(ASSISTANT_AGENT_ID, user, threadId);
		if (status.status === 'suspended') {
			// A suspended turn has no stream left to report its end.
			const options = readAssistantTurnOptions(
				status.checkpoint?.persistence?.hostMetadata?.[ASSISTANT_TURN_METADATA_KEY],
			);
			if (options.runId) {
				this.publishRunFinish(threadId, options.runId, 'cancelled', 'user_cancelled', [], user.id);
			}
		}
	}

	/** Thread deletion clears this main's in-memory state only. */
	async routeClearThreadState(threadId: string, userId?: string): Promise<void> {
		await this.clearThreadState(threadId, userId);
	}

	// ── Gateway lifecycle (delegated to LocalGatewayRegistry) ───────────────

	// ── Test-only trace replay API ───────────────────────────────────────────

	loadTraceEvents(slug: string, events: unknown[]): void {
		this.tracing.loadTraceEvents(slug, events);
	}

	getTraceEvents(slug: string): unknown[] {
		return this.tracing.getTraceEvents(slug);
	}

	activateTraceSlug(slug: string): void {
		this.tracing.activateTraceSlug(slug);
	}

	clearTraceEvents(slug: string): void {
		this.tracing.clearTraceEvents(slug);
	}

	/**
	 * Remove all in-memory state associated with a thread.
	 * Must be called when a thread is deleted so the maps don't leak.
	 */
	async clearThreadState(threadId: string, userId?: string): Promise<void> {
		this.runState.clearThread(threadId);
		await this.tracing.finalizeRemainingMessageTraceRoots(threadId, {
			status: 'cancelled',
			reason: 'thread_cleared',
			metadata: { completion_source: 'service_cleanup' },
		});

		this.schedulerLocks.delete(threadId);
		this.failedInternalFollowUpStreaks.delete(threadId);
		this.domainAccessTrackersByThread.delete(threadId);
		this.evalCredentialAllowlists.clearThread(threadId);
		this.threadPushRef.delete(threadId);
		this.planRequestsByThread.delete(threadId);
		this.memoryTaskRegistry.clearThread(threadId);
		this.tracing.deleteTraceContextsForThread(threadId);
		await this.deleteAgentBuilderSessions(threadId);
		await this.sandboxService.destroySandbox(threadId, 'thread_cleanup', userId);
		await this.temporaryWorkflowService.reapForThreadCleanup(threadId);
		this.eventBus.clearThread(threadId);
	}

	/** Builder sub-agent sessions (`ia-builder:<threadId>:*`) live in the agents
	 *  module's memory tables; instance-AI storage cleanup does not cover them.
	 *  Best-effort: a failure here must never block thread deletion. */
	private async deleteAgentBuilderSessions(threadId: string): Promise<void> {
		if (!Container.get(ModuleRegistry).isActive('agents')) return;
		try {
			await Container.get(InstanceAiBuilderDelegateAdapterService).deleteBuilderSessions(threadId);
		} catch (error) {
			this.logger.warn('Failed to clean up agent-builder sessions for thread', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async shutdown(): Promise<void> {
		this.instanceAiErrorReporter.endAllRuns();

		const threadsWithTraces = new Set(this.tracing.getTrackedThreadIds());
		for (const threadId of threadsWithTraces) {
			await this.tracing.finalizeRemainingMessageTraceRoots(threadId, {
				status: 'cancelled',
				reason: 'service_shutdown',
				metadata: { completion_source: 'service_cleanup' },
			});
		}

		this.gatewayService.disconnectAll();
		await this.browserSessionService.shutdown();
		this.sandboxService.stopSandboxExpiryTimers();

		// Thread-scoped sandboxes survive service shutdown so a restarted process
		// can reuse them. Explicit thread cleanup and idle TTL remain the
		// teardown paths.

		this.domainAccessTrackersByThread.clear();
		this.runState.clear();
		this.tracing.clear();

		// Flush in-flight drains + open coalesce buffers so the tail of every
		// streamed segment survives the restart.
		await this.eventLog.flushAll();

		this.eventBus.clear();
		await this._mcpClientManager?.disconnect();

		// Final drain of every trace's LangSmith provider so spans still sitting
		// in the batch exporter (e.g. from late memory tasks) are not lost on
		// shutdown. Best-effort by contract — never throws.
		await shutdownProductTelemetryProviders();
		this.logger.debug('Instance AI service shut down');
	}

	/**
	 * One prune pass: expire stale checkpoints, hard-delete tombstones past the
	 * GC horizon, drop expired pending confirmations, and delete expired
	 * conversation threads. A checkpoint failure propagates to the caller; the
	 * GC, confirmation, and thread steps swallow their own errors. Stops before
	 * the next step once `signal` aborts.
	 */
	async pruneExpiredData(now = Date.now(), signal?: AbortSignal): Promise<void> {
		const olderThan = new Date(now - this.instanceAiConfig.snapshotRetention);

		// Checkpoints are Agents checkpoints now. The Agents pruning task owns them.
		void olderThan;
		if (!signal?.aborted) await this.pruneExpiredThreads(signal);
		if (signal?.aborted) {
			this.logger.debug('Stopped the Instance AI prune pass early because the run was aborted');
		}
	}

	/** Deletes conversation threads past their TTL and logs instead of throwing on failure. */
	private async pruneExpiredThreads(signal?: AbortSignal): Promise<void> {
		try {
			await this.memoryService.cleanupExpiredThreads(
				async (threadId) => await this.clearThreadState(threadId),
				signal,
			);
		} catch (error: unknown) {
			this.logger.warn('Failed to clean up expired Instance AI conversation threads', {
				error: getErrorMessage(error),
			});
		}
	}

	private createAgentMemoryOptions(user: User, threadId: string, runId: string) {
		return {
			observationalMemory: {
				observerThresholdTokens:
					this.runState.getObserverThresholdTokens(threadId) ??
					this.instanceAiConfig.observerMessageTokens,
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

	private createWorkflowTaskServiceWithUiSync(
		threadId: string,
		runId: string,
		workflowTasks: WorkflowTaskCoordinator,
	): WorkflowTaskService {
		const sync = async () => await this.taskProjector.syncFromWorkflowLoop(threadId, runId);

		return {
			reportBuildOutcome: async (outcome) => {
				const action = await workflowTasks.reportBuildOutcome(outcome);
				await sync();
				return action;
			},
			reportVerificationVerdict: async (verdict) => {
				const action = await workflowTasks.reportVerificationVerdict(verdict);
				await sync();
				return action;
			},
			updateBuildOutcome: async (workItemId, update) => {
				await workflowTasks.updateBuildOutcome(workItemId, update);
				await sync();
			},
			beginVerification: async (outcome, state, verificationRunId) => {
				const resumed = await workflowTasks.beginVerification(outcome, state, verificationRunId);
				if (resumed) await sync();
				return resumed;
			},
			getBuildOutcome: async (workItemId) => await workflowTasks.getBuildOutcome(workItemId),
			startVerification: async (workItemId, triggerNodeName) => {
				const previousProgress = await workflowTasks.startVerification(workItemId, triggerNodeName);
				await sync();
				return previousProgress;
			},
			recordVerification: async (workItemId, verification, previousProgress) => {
				const claim = await workflowTasks.recordVerification(
					workItemId,
					verification,
					previousProgress,
				);
				await sync();
				return claim;
			},
			getLatestBuildOutcomeForWorkflow: async (workflowId) =>
				await workflowTasks.getLatestBuildOutcomeForWorkflow(workflowId),
			getWorkflowLoopState: async (workItemId) =>
				await workflowTasks.getWorkflowLoopState(workItemId),
		};
	}

	private trackWorkflowVerificationObligation(
		obligation: WorkflowVerificationObligation,
		event: string,
		extra: Record<string, string | number | boolean | undefined> = {},
	): void {
		try {
			this.telemetry?.track('instance_ai_workflow_verification_obligation', {
				event,
				thread_id: obligation.threadId,
				run_id: obligation.runId,
				task_id: obligation.taskId,
				planned_task_id: obligation.plannedTaskId,
				work_item_id: obligation.workItemId,
				workflow_id: obligation.workflowId,
				source: obligation.source,
				policy: obligation.policy,
				status: obligation.status,
				readiness_status: obligation.readiness?.status,
				setup_status: obligation.setupRequirement?.status,
				has_evidence: obligation.evidence?.attempted === true,
				evidence_success: obligation.evidence?.success,
				blocking_reason: obligation.blockingReason,
				...extra,
			});
		} catch (error) {
			this.logger.warn('Failed to track workflow verification obligation telemetry', {
				threadId: obligation.threadId,
				workItemId: obligation.workItemId,
				error: getErrorMessage(error),
			});
		}
	}

	private buildPlannedTaskFollowUpMessage(
		type: 'synthesize' | 'replan' | 'checkpoint' | 'build-workflow',
		graph: PlannedTaskGraph,
		options: {
			failedTask?: PlannedTaskRecord;
			checkpoint?: PlannedTaskRecord;
			buildTask?: PlannedTaskRecord;
		} = {},
	): string {
		const payload: Record<string, unknown> = {
			tasks: graph.tasks.map((task) => ({
				id: task.id,
				title: task.title,
				kind: task.kind,
				status: task.status,
				result: task.result,
				error: task.error,
				outcome: task.outcome,
			})),
		};

		if (options.failedTask) {
			payload.failedTask = {
				id: options.failedTask.id,
				title: options.failedTask.title,
				kind: options.failedTask.kind,
				error: options.failedTask.error,
				result: options.failedTask.result,
			};
		}

		if (options.checkpoint) {
			const depOutcomes = graph.tasks
				.filter((t) => options.checkpoint!.deps.includes(t.id))
				.map((t) => ({
					id: t.id,
					title: t.title,
					kind: t.kind,
					status: t.status,
					result: t.result,
					outcome: t.outcome,
				}));
			payload.checkpoint = {
				id: options.checkpoint.id,
				title: options.checkpoint.title,
				instructions: options.checkpoint.spec,
				dependsOn: depOutcomes,
			};
		}

		if (options.buildTask) {
			payload.buildTask = {
				id: options.buildTask.id,
				title: options.buildTask.title,
				kind: options.buildTask.kind,
				spec: options.buildTask.spec,
				workflowId: options.buildTask.workflowId,
				isSupportingWorkflow: options.buildTask.isSupportingWorkflow,
				deps: options.buildTask.deps,
			};
		}

		return `<planned-task-follow-up type="${type}">\n${JSON.stringify(payload, null, 2)}\n</planned-task-follow-up>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
	}

	private buildWorkflowVerificationFollowUpMessage(input: {
		obligation: WorkflowVerificationObligation;
		outcome?: WorkflowBuildOutcome;
		sourceTask?: WorkflowVerificationSourceTask;
	}): string {
		const payload = {
			obligation: input.obligation,
			outcome: input.outcome,
			sourceTask: input.sourceTask,
		};

		return `<workflow-verification-follow-up>\n${JSON.stringify(payload, null, 2)}\n</workflow-verification-follow-up>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
	}

	private async createPlannedTaskState() {
		const memory = this.agentMemory;
		const taskStorage = new ThreadTaskStorage(memory);
		const plannedTaskStorage = new PlannedTaskStorage(memory);
		const plannedTaskService = new PlannedTaskCoordinator(plannedTaskStorage);
		return { memory, taskStorage, plannedTaskService };
	}

	private async syncPlannedTasksToUi(threadId: string, graph: PlannedTaskGraph): Promise<void> {
		const { taskStorage } = await this.createPlannedTaskState();
		const tasks = await this.taskProjector.projectPlannedTaskList(threadId, graph);
		await taskStorage.save(threadId, tasks);
		this.eventBus.publish(threadId, {
			type: 'tasks-update',
			runId: graph.planRunId,
			agentId: orchestratorAgentId(graph.planRunId),
			payload: { tasks },
		});
	}

	/**
	 * Drop any persisted planned-task graph that is still `awaiting_approval`,
	 * and clear the UI checklist. Called on run cancellation and HITL timeout so
	 * stale approval state doesn't linger. A graph in `active` / `awaiting_replan`
	 * is already in-flight and has its own settlement logic.
	 */
	private async cancelAwaitingApprovalPlan(threadId: string): Promise<void> {
		try {
			const { plannedTaskService, taskStorage } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			if (!graph || graph.status !== 'awaiting_approval') return;

			await plannedTaskService.clear(threadId);
			await taskStorage.save(threadId, { tasks: [] });
			this.eventBus.publish(threadId, {
				type: 'tasks-update',
				runId: graph.planRunId,
				agentId: orchestratorAgentId(graph.planRunId),
				payload: { tasks: { tasks: [] }, planItems: [] },
			});
		} catch (error) {
			this.logger.warn('Failed to clean up awaiting_approval plan on cancel', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	areMcpConnectionsAvailable(): boolean {
		return (
			Container.get(ModuleRegistry).isActive('mcp-registry') &&
			this.settingsService.isMcpAccessEnabled()
		);
	}

	private async createExecutionEnvironment(
		user: User,
		threadId: string,
		runId: string,
		abortSignal: AbortSignal,
		messageGroupId?: string,
		pushRef?: string,
		proxyRunConfig?: Awaited<ReturnType<InstanceAiService['createProxyRunConfig']>>,
		instanceContextGates?: InstanceContextGates,
		experimentGates?: Awaited<ReturnType<InstanceAiAdapterService['resolveExperimentGates']>>,
		resumeAgentBuild = false,
	) {
		const memory = this.agentMemory;
		const boundProjectId = await this.resolveThreadProjectId(threadId);
		if (!boundProjectId) {
			throw new UnexpectedError(
				`Instance AI thread "${threadId}" has no bound project; it must be created via POST /instance-ai/threads before a run can start`,
			);
		}

		const adminSettings = await this.settingsService.getAdminSettings();
		const localGatewayDisabledGlobally = adminSettings.localGatewayDisabled;
		const browserUseEnabledGlobally = adminSettings.browserUseEnabled;
		const mcpConnectionsAvailable = this.areMcpConnectionsAvailable();
		const localGatewayDisabledForUser = await this.settingsService.isLocalGatewayDisabledForUser(
			user.id,
		);
		const userGateway = this.gatewayService.findGateway(user.id);

		// There's another ensure lock check at `getCredits`, which only fires when the frontend mounts.
		await this.creditService.ensureQuotaLockApplied(user);

		const { searchProxyConfig, tokenManager, proxyBaseUrl } =
			proxyRunConfig ?? (await this.createProxyRunConfig(user));

		const proxyContext = { runId, threadId };
		const modelId =
			proxyBaseUrl && tokenManager
				? await this.modelService.resolveProxyModel(user, proxyBaseUrl, tokenManager, proxyContext)
				: await this.modelService.resolveAgentModelConfig(user, proxyContext);

		const gates = experimentGates ?? (await this.adapterService.resolveExperimentGates(user));
		const {
			configEvalsEnabled,
			conversationHistoryEnabled,
			progressiveBuildingEnabled,
			conciseStyleEnabled,
			setupPanelEnabled,
			setupPanelVariant,
			folderExplorationEnabled,
			credentialDescriptionsEnabled,
			aiPreferencesEnabled,
		} = gates;
		this.runState.setSetupPanelEnabled(threadId, setupPanelEnabled);
		// Resumed segments use the gates bound to the original turn.
		const { instanceContextEnabled, nodeUsageEnabled } = instanceContextGates ?? gates;
		// One scoped reader backs both the tool and the first-turn hint.
		const conversationHistory = conversationHistoryEnabled
			? this.conversationHistoryService.forContext(user.id, boundProjectId, threadId)
			: undefined;
		// Follow-ups and resumed runs retain the selected mode if flags change.
		const mode =
			this.runState.getBuildMode(threadId) ??
			(progressiveBuildingEnabled ? 'progressive' : 'default');
		// The operator pin sits below the request pin and the thread's own selection,
		// so evals and in-flight conversations keep the profile they started on.
		// The concise experiment applies only in default mode, so a progressive
		// thread or assignment keeps its own profile.
		const selectedPrompt = resolvePromptProfile({
			version:
				this.runState.getPromptVersion(threadId) ??
				resolveOperatorPromptVersion(this.instanceAiConfig.promptVersion) ??
				(conciseStyleEnabled && mode === 'default' ? CONCISE_PROMPT_VERSION : undefined),
			mode,
		});
		const buildMode = selectedPrompt.profile.mode;
		this.runState.setBuildMode(threadId, buildMode);
		// Read per run so a settings change applies to the next message.
		const allowSendingParameterValues = await this.aiUsageService.isParameterValueSharingAllowed();
		// The frontend writes the exit to thread metadata when the agent calls `leave-onboarding` or
		// starts a build, so a thread that left gets the tool no more.
		const thread = await memory.getThread(threadId);
		const onboardingThread =
			thread?.metadata?.source === 'onboarding' && !thread.metadata.onboardingLeft;
		const context = this.adapterService.createContext(user, {
			searchProxyConfig,
			pushRef,
			threadId,
			projectId: boundProjectId,
			getCredentialIdAllowlist: () => this.evalCredentialAllowlists.get(threadId),
			shouldBypassCredentialTest: (credentialId: string) =>
				this.evalCredentialAllowlists.shouldBypassTest(threadId, credentialId),
			configEvalsEnabled,
			setupPanelVariant,
			mcpConnectionsAvailable,
			nodeUsageEnabled,
			instanceContextEnabled,
			conversationHistory,
			folderExplorationEnabled,
			onboardingThread,
			credentialDescriptionsEnabled,
			aiPreferencesEnabled,
			modelId,
			allowSendingParameterValues,
			resumeAgentBuild,
		});

		// Merge both local gateway and direct browser-use into a single
		// composite server, since context has a single `localMcpServer`.
		// Perhaps a better solution would be to have multiple local MCP
		// servers? But that requires more changes where `localMcpServer`
		// is currently used

		// When Browser Use is disabled instance-wide, hide the gateway's browser tools
		// too so they are neither advertised to nor callable by the agent.
		this.gatewayService.applyToolPolicy(user.id);
		const gatewayMcpServer =
			!localGatewayDisabledForUser && userGateway?.isConnected ? userGateway : undefined;
		const browserMcpServer = browserUseEnabledGlobally
			? this.browserSessionService.findMcpServer(user.id)
			: undefined;
		const localMcpServer = composeLocalMcpServers(gatewayMcpServer, browserMcpServer);
		if (localMcpServer) {
			context.localMcpServer = localMcpServer;
		}

		context.permissions = this.settingsService.getPermissions();
		if (this.instanceWriteAccess.isReadOnly()) {
			context.permissions = applyBranchReadOnlyOverrides(context.permissions);
			context.branchReadOnly = true;
		}

		context.runId = runId;

		// Setup panel v2: wire the durable `setup-items` sink only while the flag
		// is on — its presence is the package-side gate. Seeded with the thread's
		// persisted snapshots so a recomputed, unchanged list publishes nothing.
		if (setupPanelEnabled) {
			context.setupItemsEmitter = createSetupItemsEmitter({
				eventBus: this.eventBus,
				threadId,
				runId,
				agentId: orchestratorAgentId(runId),
				initialSnapshots: await this.eventLog.getSetupItemsSnapshots(threadId).catch((error) => {
					this.logger.warn('Failed to read setup panel snapshots', {
						threadId,
						error: getErrorMessage(error),
					});
					return [];
				}),
				readPersistedSnapshot: async (workflowId) => {
					const snapshots = await this.eventLog.getSetupItemsSnapshots(threadId);
					return snapshots.find((snapshot) => snapshot.workflowId === workflowId)?.items;
				},
			});
			context.markWorkflowSetupHandled = async (workflowId) => {
				await this.markWorkflowSetupHandled(threadId, workflowId, runId, {
					requirePersisted: true,
				});
			};
		}

		context.browserCredentialSetup = this.createBrowserCredentialSetupTracker(runId, user.id);

		// Per-user, thread-level "always allow" grants are persisted in the DB so they survive
		// reload/navigation and are visible across mains. Load once per run; a tool resuming
		// from a `scope: 'session'` approval persists new grants via `grantSessionToolApproval`.
		// Keep the mutable set so a grant approved mid-run is honored by later calls in the same
		// run — the next run reloads it from the DB anyway.
		const sessionGrants = await this.loadThreadSessionGrants(threadId, user.id);
		context.sessionApprovedToolKeys = sessionGrants;
		const grantSessionToolApproval = async (key: string) => {
			await this.persistThreadSessionGrant(threadId, user.id, key);
			sessionGrants.add(key);
		};
		context.grantSessionToolApproval = grantSessionToolApproval;
		context.revokeSessionToolApproval = async (key: string) => {
			await this.revokeThreadSessionGrant(threadId, user.id, key);
			sessionGrants.delete(key);
		};

		// Domain-access approvals are stored as grant keys in `instance_ai_thread_grants` (via
		// the same load/persist path as above), so they survive restart and are visible
		// cross-main. Recreate the tracker per run seeded from the freshly loaded grants;
		// transient (allow_once) approvals are run-scoped and don't carry across runs.
		const domainTracker = createDomainAccessTracker({
			grantedKeys: sessionGrants,
			persistGrant: grantSessionToolApproval,
		});
		this.domainAccessTrackersByThread.set(threadId, domainTracker);
		context.domainAccessTracker = domainTracker;

		browserMcpServer?.setDomainGate({
			tracker: domainTracker,
			runId,
			permissionMode: context.permissions?.fetchUrl,
			createCredentialPermissionMode: context.permissions?.createCredential,
		});

		// The client reports which + menu entries it renders, because only it can see
		// its own rollout and the device. The admin switches are still applied here,
		// so the report can only narrow.
		context.computerUseState = resolveComputerUseState({
			localGatewayDisabledGlobally,
			localGatewayDisabledForUser,
			browserUseEnabledGlobally,
			clientChannels: this.runState.getComputerUseChannels(threadId),
			localComputerToolCategories: gatewayMcpServer
				? enabledToolCategories(gatewayMcpServer.getStatus().toolCategories)
				: undefined,
			browserConnected: browserMcpServer !== undefined,
		});

		const taskStorage = new ThreadTaskStorage(memory);
		const iterationLog = this.dbIterationLogStorage;
		const workflowLoopStorage = new WorkflowLoopStorage(memory);
		const workflowTasks = this.createWorkflowTaskServiceWithUiSync(
			threadId,
			runId,
			new WorkflowTaskCoordinator(threadId, workflowLoopStorage),
		);
		const plannedTaskStorage = new PlannedTaskStorage(memory);
		const plannedTaskService = new PlannedTaskCoordinator(plannedTaskStorage);

		const nodeDefDirs = this.adapterService.getNodeDefinitionDirs();
		if (nodeDefDirs.length > 0) {
			setSchemaBaseDirs(nodeDefDirs);
		}

		// Hide disabled skills in each derived source. Keep the cached source unchanged.
		const flagDisabledSkillIds = disabledInstanceAiSkillIds({
			configEvalsEnabled,
			instanceContextEnabled,
		});
		const selectedSkills = await loadInstanceAiPromptSkills(selectedPrompt.profile);
		const selectedRuntimeSkills = selectedSkills.source;
		const allRuntimeSkills =
			flagDisabledSkillIds.length > 0
				? filterRuntimeSkillSource(selectedRuntimeSkills, flagDisabledSkillIds)
				: selectedRuntimeSkills;
		const promptMetadata = describePromptProfile(selectedPrompt, allRuntimeSkills);
		this.runState.setPromptConfiguration(threadId, promptMetadata);
		let runtimeSkills = allRuntimeSkills;
		let runtimeWorkspace: Workspace | undefined;
		let workspaceRoot: string | undefined;

		const sandboxStatus = this.settingsService.getSandboxStatus();
		if (sandboxStatus.workflowBuilderAvailable) {
			const sandboxConfig = await this.instanceAiErrorReporter.withBoundary(
				'instance-ai-sandbox-setup',
				{ threadId, runId, userId: user.id, messageGroupId },
				async () => await this.sandboxService.resolveSandboxConfig(user),
			);

			if (sandboxConfig.enabled) {
				workspaceRoot = getPromptWorkspaceRoot(sandboxConfig.provider);

				let sandboxEntryPromise: Promise<RuntimeSandboxEntry | undefined> | undefined;
				const getSandboxEntry = async () => {
					sandboxEntryPromise ??= this.sandboxService
						.getOrCreateWorkspaceEntry(threadId, user)
						.catch((error: unknown) => {
							sandboxEntryPromise = undefined;
							throw error;
						});

					return await sandboxEntryPromise;
				};
				const getSetupSandboxEntry = async () => {
					return await this.sandboxService.getOrCreateWorkspace(threadId, user, context);
				};

				const scopeWorkspaceForAgent = async (
					workspace: Workspace | undefined,
				): Promise<Workspace | undefined> => {
					if (!workspace) return undefined;
					const root = await getWorkspaceRoot(workspace);
					return createScopedWorkspace(workspace, root);
				};

				runtimeWorkspace = createLazyRuntimeWorkspace({
					// Empty + stable across resumes: sandbox/filesystem guidance lives in
					// the system prompt's `## Sandbox workspace` section. Passing '' here
					// (instead of omitting) keeps the lazy workspace from falling back to
					// resolution-dependent live `getInstructions()` text, which would
					// shift the cached prompt prefix across rebuilds/resumes.
					sandboxInstructions: '',
					filesystemInstructions: '',
					ensureWorkspace: async () =>
						await scopeWorkspaceForAgent((await getSetupSandboxEntry())?.workspace),
				});
				const runtimeSkillWorkspace = createLazyRuntimeWorkspace({
					id: 'instance-ai-runtime-skill-workspace',
					name: 'Instance AI runtime skill workspace',
					ensureWorkspace: async () =>
						await scopeWorkspaceForAgent((await getSandboxEntry())?.workspace),
				});
				runtimeSkills = createLazyWorkspaceRuntimeSkillSource({
					source: allRuntimeSkills,
					workspace: runtimeSkillWorkspace,
					logger: this.logger,
				});
			}
		}

		context.workspace = runtimeWorkspace;
		context.workspaceRoot = workspaceRoot;
		context.threadId = threadId;
		context.threadMemory = memory;
		// Tool-emitted telemetry is an open-ended property bag (search queries,
		// remediation reasons, node error strings) — scrub at the boundary so a
		// new call site can't leak by omission.
		context.trackTelemetry = (eventName, properties) => {
			this.telemetry.track(eventName, redactTelemetryProperties(properties));
		};
		const orchestrationContext: OrchestrationContext = {
			threadId,
			runId,
			messageGroupId,
			userId: user.id,
			projectId: boundProjectId,
			promptConfiguration: promptMetadata,
			disabledToolNames: new Set(selectedSkills.disabledTools),
			setupPanelEnabled: isSetupPanelEnabled(context),
			orchestratorAgentId: orchestratorAgentId(runId),
			modelId,
			modelStreamStallOptions: modelStreamStallOptions(this.aiConfig),
			eventBus: this.eventBus,
			logger: this.logger,
			trackTelemetry: (eventName, properties) => {
				this.telemetry.track(eventName, redactTelemetryProperties(properties));
			},
			// Aggregate on the instance-AI thread (not the `ia-builder:` session
			// thread) so the credit service's per-thread display total and FE push
			// attribute builder tokens to the conversation the user sees. The tool
			// awaits this before returning/cascading a terminal segment outcome, so
			// a billing failure must never propagate — best-effort by contract.
			claimSubAgentUsage: async (dedupeId, usage, status) => {
				try {
					await this.creditService.claimRunUsage(user, threadId, dedupeId, usage, status);
				} catch (error) {
					// claimRunUsage() handles ordinary claim failures (network, retries)
					// internally and only throws for exceptional contract violations
					// (e.g. a negative quota) — those must still reach centralized
					// Instance AI error reporting even though billing stays best-effort.
					this.instanceAiErrorReporter.report(error, {
						component: 'instance-ai-agent-builder-usage',
						threadId,
						runId,
						userId: user.id,
						...(boundProjectId ? { projectId: boundProjectId } : {}),
						...(messageGroupId ? { messageGroupId } : {}),
					});
					this.logger.warn('Failed to claim agent-builder usage', {
						threadId,
						runId,
						dedupeId,
						error: getErrorMessage(error),
					});
				}
			},
			abortSignal,
			taskStorage,
			timeZone: this.defaultTimeZone,
			localMcpServer: context.localMcpServer,
			runtimeSkills,
			runtimeSkillCatalog: allRuntimeSkills,
			oauth2CallbackUrl: this.oauth2CallbackUrl,
			plannedTaskService,
			schedulePlannedTasks: async () => await this.schedulePlannedTasks(user, threadId),
			iterationLog,
			workflowTaskService: workflowTasks,
			workspace: runtimeWorkspace,
			workspaceRoot,
			nodeDefinitionDirs: nodeDefDirs.length > 0 ? nodeDefDirs : undefined,
			domainContext: context,
		};

		return {
			context,
			memory,
			taskStorage,
			iterationLog,
			workflowTasks,
			plannedTaskService,
			modelId,
			orchestrationContext,
			conversationHistory,
			aiPreferencesEnabled,
			// Reuse the gate results so a rollout change cannot split this turn.
			instanceContextEnabled,
			nodeUsageEnabled,
		};
	}

	/**
	 * Resolve the agents execution service only when the `agents` module is
	 * active. Mirrors the builder-delegate gate so agent-preview handoff is
	 * absent (rather than exploding) when agents are disabled.
	 */
	private getAgentExecutionService(): AgentExecutionService | null {
		if (!Container.get(ModuleRegistry).isActive('agents')) return null;
		try {
			return Container.get(AgentExecutionService);
		} catch {
			return null;
		}
	}

	/** Wire project-scoped, read-only Agent context for the current user. */
	private async bindAgentContextReader(
		context: Awaited<ReturnType<InstanceAiService['createExecutionEnvironment']>>['context'],
		user: User,
	): Promise<void> {
		const projectId = context.projectId;
		if (!projectId) return;
		if (!(await userHasScopes(user, ['agent:read'], false, { projectId }))) return;

		if (!Container.get(ModuleRegistry).isActive('agents')) return;
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
	private async bindAgentPreviewSession(
		context: Awaited<ReturnType<InstanceAiService['createExecutionEnvironment']>>['context'],
		user: User,
	): Promise<void> {
		await resolveAgentPreviewSession(context);
		const projectId = context.projectId;
		if (!context.agentPreviewSession || !projectId) return;
		if (!(await this.canAccessAgentPreviewHandoff(user, projectId))) {
			context.agentPreviewSession = undefined;
			return;
		}

		context.resolvePreviewSession = async (ref) => {
			const service = this.getAgentExecutionService();
			if (!service) return null;
			const detail = await service.getThreadDetail(ref.threadId, projectId, ref.agentId, user.id);
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

	private async dispatchPlannedTask(
		task: PlannedTaskRecord,
		context: OrchestrationContext,
		_graph?: PlannedTaskGraph,
	): Promise<void> {
		if (task.kind === 'build-workflow' || task.kind === 'checkpoint') {
			this.logger.warn('dispatchPlannedTask called for a runtime planned-task kind', {
				threadId: context.threadId,
				taskId: task.id,
				kind: task.kind,
			});
			return;
		}

		await context.plannedTaskService?.markFailed(context.threadId, task.id, {
			error: `Planned task kind "${task.kind}" is no longer supported`,
		});

		const nextGraph = await context.plannedTaskService?.getGraph(context.threadId);
		if (nextGraph) {
			await this.syncPlannedTasksToUi(context.threadId, nextGraph);
		}
	}

	private collectWorkflowIds(value: unknown, workflowIds: Set<string>): void {
		if (value === null || value === undefined || typeof value !== 'object') return;

		if (Array.isArray(value)) {
			for (const item of value) {
				this.collectWorkflowIds(item, workflowIds);
			}
			return;
		}

		for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
			if (key === 'workflowId' && typeof child === 'string' && child.length > 0) {
				workflowIds.add(child);
				continue;
			}

			if (key === 'supportingWorkflowIds' && Array.isArray(child)) {
				for (const workflowId of child) {
					if (typeof workflowId === 'string' && workflowId.length > 0) {
						workflowIds.add(workflowId);
					}
				}
				continue;
			}

			this.collectWorkflowIds(child, workflowIds);
		}
	}

	private getBuildTaskWorkflowName(task: PlannedTaskRecord): string | undefined {
		if (task.kind !== 'build-workflow') return undefined;

		const titleMatch =
			task.title.match(/^Build '(.+)' workflow$/) ?? task.title.match(/^Build "(.+)" workflow$/);

		return titleMatch?.[1];
	}

	/**
	 * Keep explicit user-requested runs approval-gated when they happen as checkpoint fallback.
	 */
	private checkpointRequiresRunApproval(
		graph: PlannedTaskGraph,
		_checkpoint: PlannedTaskRecord,
	): boolean {
		return graph.postBuildRunApprovalRequired === true;
	}

	/**
	 * Resolve the workflows the checkpoint task is verifying so the runWorkflow
	 * permission override can be scoped. Workflow names are carried as an E2E replay
	 * fallback because runtime workflow IDs can be remapped.
	 */
	private async getCheckpointRunPolicy(
		threadId: string,
		checkpointTaskId: string,
	): Promise<{
		allowedWorkflowIds: ReadonlySet<string>;
		allowedWorkflowNames: ReadonlySet<string>;
		requireApproval: boolean;
	}> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const checkpoint = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (!graph || !checkpoint) {
				return {
					allowedWorkflowIds: new Set(),
					allowedWorkflowNames: new Set(),
					requireApproval: false,
				};
			}
			const deps = new Set(checkpoint.deps);
			const ids = new Set<string>();
			const names = new Set<string>();
			for (const task of graph.tasks) {
				if (!deps.has(task.id)) continue;

				const workflowName = this.getBuildTaskWorkflowName(task);
				if (workflowName) {
					names.add(workflowName);
				}

				if (task.workflowId) {
					ids.add(task.workflowId);
				}
				this.collectWorkflowIds(task.outcome, ids);
			}

			const tracing = this.tracing.getTraceContextForContinuation(threadId);
			for (const workflowId of [...ids]) {
				const remappedWorkflowId = tracing?.idRemapper?.remapOutput(workflowId);
				if (typeof remappedWorkflowId === 'string' && remappedWorkflowId.length > 0) {
					ids.add(remappedWorkflowId);
				}
			}
			return {
				allowedWorkflowIds: ids,
				allowedWorkflowNames: names,
				requireApproval: this.checkpointRequiresRunApproval(graph, checkpoint),
			};
		} catch (error) {
			this.logger.warn('Failed to resolve checkpoint allowed workflow IDs', {
				threadId,
				checkpointTaskId,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				allowedWorkflowIds: new Set(),
				allowedWorkflowNames: new Set(),
				requireApproval: false,
			};
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

	private buildWorkflowSetupFollowUpMessage(obligation: WorkflowVerificationObligation): string {
		const payload = {
			workflowId: obligation.workflowId,
			workItemId: obligation.workItemId,
			setupRequirement: obligation.setupRequirement,
			verificationReadiness: obligation.readiness,
		};
		return `<workflow-setup-required>\n${JSON.stringify(payload, null, 2)}\n</workflow-setup-required>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
	}

	private async markWorkflowSetupHandled(
		threadId: string,
		workflowId: string,
		runId?: string,
		options: { requirePersisted?: boolean } = {},
	): Promise<boolean> {
		const records = await this.listWorkflowLoopRecords(threadId);
		if (records.length === 0) return false;

		const candidates: Array<{
			record: WorkflowLoopWorkItemRecord;
			obligation: WorkflowVerificationObligation;
		}> = [];

		for (const record of records) {
			if (record.state.setupRoutedAt) continue;
			if (this.workflowObligations.isPlannedRecord(record)) continue;

			const obligation = this.workflowObligations.obligationFromRecord(threadId, record, {
				source: 'direct',
			});
			if (obligation.workflowId !== workflowId) continue;
			if (obligation.setupRequirement?.status !== 'required') continue;

			candidates.push({ record, obligation });
		}

		const sameRunCandidates = runId
			? candidates.filter(
					({ obligation, record }) => obligation.runId === runId || record.state.runId === runId,
				)
			: [];
		const fallbackCandidates = candidates.filter(
			(candidate) => !sameRunCandidates.includes(candidate),
		);

		for (const { record, obligation } of [...sameRunCandidates, ...fallbackCandidates]) {
			const claim = await this.claimWorkItemSetupRouting(threadId, record);
			if (!claim) continue;

			let marked: boolean;
			try {
				marked = await this.markWorkItemSetupRouted(
					threadId,
					record.state.workItemId,
					claim.claimId,
				);
			} catch (error) {
				await this.releaseWorkItemSetupRoutingClaim(
					threadId,
					record.state.workItemId,
					claim.claimId,
				);
				throw error;
			}
			if (!marked) {
				await this.releaseWorkItemSetupRoutingClaim(
					threadId,
					record.state.workItemId,
					claim.claimId,
				);
				if (options.requirePersisted) {
					throw new OperationalError('Workflow setup routing marker was not saved');
				}
				this.logger.warn('Workflow setup completed but routing marker was not saved', {
					threadId,
					workItemId: record.state.workItemId,
					workflowId,
				});
				continue;
			}

			this.trackWorkflowVerificationObligation(obligation, 'setup_completed_by_tool');
			return true;
		}

		return false;
	}

	/**
	 * Deterministically route a settled direct build to setup when its saved
	 * workflow still needs real credentials or values. Runs after verification so
	 * setup does not depend on the orchestrator choosing to call it. The persisted
	 * claim and `setupRoutedAt` marker make this fire at most once per build, so
	 * concurrent finalization re-entries cannot start duplicate setup runs.
	 */
	private async maybeStartWorkflowSetupFollowUp(user: User, threadId: string): Promise<boolean> {
		const records = await this.listWorkflowLoopRecords(threadId);
		if (records.length === 0) return false;

		for (const record of records) {
			if (record.state.setupRoutedAt) continue;
			if (this.workflowObligations.isPlannedRecord(record)) continue;

			const obligation = this.workflowObligations.obligationFromRecord(threadId, record, {
				source: 'direct',
			});
			const verificationConcluded =
				obligation.status === 'verified' ||
				obligation.status === 'needs_setup' ||
				obligation.status === 'not_verifiable';
			if (!verificationConcluded) continue;
			if (obligation.setupRequirement?.status !== 'required' || !obligation.workflowId) continue;

			const claim = await this.claimWorkItemSetupRouting(threadId, record);
			if (!claim) continue;

			const startedRunId = await this.startInternalFollowUpRun(
				user,
				threadId,
				this.buildWorkflowSetupFollowUpMessage(obligation),
				(await this.getLiveRun(threadId)).messageGroupId,
				false,
				undefined,
				'workflow_setup',
			);
			if (startedRunId.length === 0) {
				await this.releaseWorkItemSetupRoutingClaim(
					threadId,
					record.state.workItemId,
					claim.claimId,
				);
				return false;
			}

			const marked = await this.markWorkItemSetupRouted(
				threadId,
				record.state.workItemId,
				claim.claimId,
			);
			if (!marked) {
				this.logger.warn('Workflow setup follow-up started but routing marker was not saved', {
					threadId,
					workItemId: record.state.workItemId,
				});
			}
			this.trackWorkflowVerificationObligation(obligation, 'setup_follow_up_started');
			return true;
		}

		return false;
	}

	private async listWorkflowLoopRecords(threadId: string): Promise<WorkflowLoopWorkItemRecord[]> {
		return await new WorkflowLoopStorage(this.agentMemory).listWorkItems(threadId);
	}

	private createWorkflowSetupRoutingClaim(): WorkflowSetupRoutingClaim {
		const claimedAt = new Date();
		const expiresAt = new Date(claimedAt.getTime() + WORKFLOW_SETUP_ROUTING_CLAIM_TTL_MS);
		return {
			claimId: `setup:${nanoid()}`,
			claimedAt: claimedAt.toISOString(),
			expiresAt: expiresAt.toISOString(),
		};
	}

	private async claimWorkItemSetupRouting(
		threadId: string,
		record: WorkflowLoopWorkItemRecord,
	): Promise<WorkflowSetupRoutingClaim | null> {
		const claim = this.createWorkflowSetupRoutingClaim();
		const claimed = await new WorkflowLoopStorage(this.agentMemory).claimSetupRouting(
			threadId,
			record.state.workItemId,
			claim,
		);
		return claimed ? claim : null;
	}

	private async markWorkItemSetupRouted(
		threadId: string,
		workItemId: string,
		claimId: string,
	): Promise<boolean> {
		return await new WorkflowLoopStorage(this.agentMemory).markSetupRouted(
			threadId,
			workItemId,
			claimId,
			new Date().toISOString(),
		);
	}

	private async releaseWorkItemSetupRoutingClaim(
		threadId: string,
		workItemId: string,
		claimId: string,
	): Promise<void> {
		await new WorkflowLoopStorage(this.agentMemory).releaseSetupRoutingClaim(
			threadId,
			workItemId,
			claimId,
		);
	}

	/**
	 * Feed the follow-up circuit breaker from a run's terminal status. Errored
	 * machine-started follow-ups (`isInternalFollowUp`) extend the streak; any
	 * run that completes or suspends proves the thread executes again and
	 * resets it. Cancelled runs carry no signal either way.
	 */
	private updateInternalFollowUpFailureStreak(
		threadId: string,
		status: MessageTraceFinalization['status'] | undefined,
		isInternalFollowUp: boolean,
	): void {
		if (status === 'completed' || status === 'suspended') {
			this.failedInternalFollowUpStreaks.delete(threadId);
			return;
		}
		if (status === 'error' && isInternalFollowUp) {
			this.failedInternalFollowUpStreaks.set(
				threadId,
				(this.failedInternalFollowUpStreaks.get(threadId) ?? 0) + 1,
			);
		}
	}

	/** Queue a machine follow-up. It runs after the current turn, with a hidden message. */
	private async startInternalFollowUpRun(
		user: User,
		threadId: string,
		message: string,
		messageGroupId?: string,
		isReplanFollowUp: boolean = false,
		checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string },
		resumeReasonOverride?: OrchestratorResumeReason,
		plannedBuild?: PlannedBuildFollowUp,
	): Promise<string> {
		const failedStreak = this.failedInternalFollowUpStreaks.get(threadId) ?? 0;
		if (failedStreak >= MAX_CONSECUTIVE_FAILED_INTERNAL_FOLLOW_UPS) {
			this.logger.warn('Skipping internal follow-up: consecutive follow-up runs keep failing', {
				threadId,
				failedStreak,
				resumeReason: resumeReasonOverride,
			});
			return '';
		}
		const resumeReason: OrchestratorResumeReason =
			resumeReasonOverride ??
			(checkpoint
				? 'planned_checkpoint'
				: isReplanFollowUp
					? 'replan'
					: 'background_task_completed');
		const defaults = await this.readTurnDefaults(threadId);
		const savedOutcomeFree = plannedBuild
			? {
					isPlannedBuildFollowUp: plannedBuild.isPlannedBuildFollowUp,
					buildTaskId: plannedBuild.buildTaskId,
					workItemId: plannedBuild.workItemId,
					isSupportingWorkflowTask: plannedBuild.isSupportingWorkflowTask,
				}
			: undefined;
		const { runId } = await this.enqueueAssistantTurn(user, threadId, message, {
			runId: `run_${nanoid()}`,
			messageGroupId,
			...defaults,
			timeZone: defaults.timeZone ?? this.defaultTimeZone,
			resumeReason,
			isReplanFollowUp,
			checkpoint,
			plannedBuild: savedOutcomeFree,
		});
		return runId;
	}

	private async schedulePlannedTasks(user: User, threadId: string): Promise<void> {
		const prev = this.schedulerLocks.get(threadId) ?? Promise.resolve();
		// eslint-disable-next-line @typescript-eslint/promise-function-async
		const current = prev.then(() => this.doSchedulePlannedTasks(user, threadId)).catch(() => {});
		this.schedulerLocks.set(threadId, current);
		await current;
	}

	private createPlannedTaskActionRunner(
		activeUser: User,
		threadId: string,
		plannedTaskService: PlannedTaskService,
	): PlannedTaskActionRunner {
		const scope: PlannedTaskRunScope = { user: activeUser, threadId };
		return new PlannedTaskActionRunner({
			scope,
			plannedTaskService,
			logger: this.logger,
			view: this.createPlannedTaskView(),
			runGate: this.createPlannedTaskRunGate(),
			dispatcher: this.createPlannedTaskDispatcher(),
			followUps: this.createPlannedTaskFollowUps(),
			workflowVerificationGate: this.createPlannedWorkflowVerificationGate(threadId),
			workflowVerificationTracker: this.createPlannedWorkflowVerificationTracker(),
		});
	}

	private createPlannedTaskView(): PlannedTaskView {
		return {
			sync: async (scope, graph) => await this.syncPlannedTasksToUi(scope.threadId, graph),
		};
	}

	private createPlannedTaskRunGate(): PlannedTaskRunGate {
		return {
			// The Agents runtime queues follow-ups behind a live turn.
			hasLiveRun: () => false,
		};
	}

	private createPlannedTaskDispatcher(): PlannedTaskDispatcher {
		return {
			dispatch: async ({ scope, graph, tasks }) => {
				const context = await this.createPlannedTaskDispatchContext(
					scope.user,
					scope.threadId,
					graph,
				);

				for (const task of tasks) {
					await this.dispatchPlannedTask(task, context, graph);
				}
			},
		};
	}

	private createPlannedTaskFollowUps(): PlannedTaskFollowUpStarter {
		return {
			startReplan: async ({ scope, graph, failedTask }) =>
				await this.startInternalFollowUpRun(
					scope.user,
					scope.threadId,
					this.buildPlannedTaskFollowUpMessage('replan', graph, { failedTask }),
					graph.messageGroupId,
					true,
					undefined,
					undefined,
					undefined,
				),
			startWorkflowVerification: async ({ scope, graph, verification }) =>
				await this.startInternalFollowUpRun(
					scope.user,
					scope.threadId,
					this.buildWorkflowVerificationFollowUpMessage({
						obligation: verification.obligation,
						outcome: verification.outcome,
						sourceTask: this.toWorkflowVerificationSourceTask(verification),
					}),
					graph.messageGroupId,
					false,
					undefined,
					'workflow_verification',
					undefined,
				),
			startSynthesis: async ({ scope, graph }) =>
				await this.startInternalFollowUpRun(
					scope.user,
					scope.threadId,
					this.buildPlannedTaskFollowUpMessage('synthesize', graph),
					graph.messageGroupId,
					false,
					undefined,
					'synthesize',
					undefined,
				),
			startWorkflowBuild: async ({ scope, graph, task, workItemId }) => {
				const plannedBuild: PlannedBuildFollowUp = {
					isPlannedBuildFollowUp: true,
					buildTaskId: task.id,
					workItemId,
					isSupportingWorkflowTask: task.isSupportingWorkflow === true,
				};

				return await this.startInternalFollowUpRun(
					scope.user,
					scope.threadId,
					this.buildPlannedTaskFollowUpMessage('build-workflow', graph, { buildTask: task }),
					graph.messageGroupId,
					false,
					undefined,
					undefined,
					plannedBuild,
				);
			},
			startCheckpoint: async ({ scope, graph, task }) =>
				await this.startInternalFollowUpRun(
					scope.user,
					scope.threadId,
					this.buildPlannedTaskFollowUpMessage('checkpoint', graph, { checkpoint: task }),
					graph.messageGroupId,
					false,
					{ isCheckpointFollowUp: true, checkpointTaskId: task.id },
					undefined,
					undefined,
				),
		};
	}

	private createPlannedWorkflowVerificationGate(threadId: string): PlannedWorkflowVerificationGate {
		return {
			revalidate: async (verification) =>
				await this.workflowObligations.revalidatePlannedWorkflowVerification(
					threadId,
					verification,
				),
		};
	}

	private toWorkflowVerificationSourceTask(
		verification: PlannedWorkflowVerification,
	): WorkflowVerificationSourceTask {
		return {
			taskId: verification.task.backgroundTaskId ?? verification.task.id,
			role: 'workflow-builder',
			status: 'completed',
			result: verification.task.result,
			error: verification.task.error,
			plannedTaskId: verification.task.id,
			workItemId: verification.obligation.workItemId,
		};
	}

	private createPlannedWorkflowVerificationTracker(): PlannedWorkflowVerificationTracker {
		return {
			scheduled: ({ obligation }) =>
				this.trackWorkflowVerificationObligation(obligation, 'planned_verification_scheduled'),
			followUpStartAttempted: ({ obligation }, started) =>
				this.trackWorkflowVerificationObligation(obligation, 'follow_up_start_attempted', {
					follow_up_started: started,
				}),
		};
	}

	private async createPlannedTaskDispatchContext(
		user: User,
		threadId: string,
		graph: PlannedTaskGraph,
	): Promise<OrchestrationContext> {
		const environment = await this.createExecutionEnvironment(
			user,
			threadId,
			graph.planRunId,
			createInertAbortSignal(),
			graph.messageGroupId,
			this.threadPushRef.get(threadId),
		);
		environment.orchestrationContext.tracing = this.tracing.getTraceContext(graph.planRunId);
		return environment.orchestrationContext;
	}

	private async doSchedulePlannedTasks(user: User, threadId: string): Promise<void> {
		const revalidated = await this.revalidateActiveUser(user.id);
		if (!revalidated) {
			this.logger.warn('Cancelling run: user no longer authorized for n8n Assistant', {
				userId: user.id,
				threadId,
			});
			this.cancelRun(threadId);
			return;
		}

		const activeUser = revalidated;

		const { plannedTaskService } = await this.createPlannedTaskState();
		const actionRunner = this.createPlannedTaskActionRunner(
			activeUser,
			threadId,
			plannedTaskService,
		);

		while (true) {
			const graph = await plannedTaskService.getGraph(threadId);
			if (!graph) return;

			await this.syncPlannedTasksToUi(threadId, graph);

			const availableSlots = MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD;
			const pendingWorkflowVerification =
				await this.workflowObligations.findPendingPlannedWorkflowVerification(threadId, graph);
			const action = await plannedTaskService.tick(threadId, {
				availableSlots,
				pendingWorkflowVerification,
			});
			if (action.type === 'none') return;

			const result = await actionRunner.run(action);
			if (result.type !== 'continue-scheduling') return;
		}
	}

	/**
	 * Splits a message's attachments into the resource references that feed the
	 * context block. The canvas node-context and Assistant mentions flags both
	 * accept `nodes` attachments. Workflow and agent references always pass.
	 */
	private resolveContextAttachments(
		attachments: InstanceAiAttachment[] | undefined,
		nodeContextEnabled: boolean,
	): InstanceAiResourceAttachment[] {
		const attachmentsOrEmpty = attachments ?? [];

		const workflowAttachments = attachmentsOrEmpty.filter(
			(attachment): attachment is InstanceAiWorkflowAttachment => attachment.type === 'workflow',
		);

		const agentAttachments = attachmentsOrEmpty.filter(
			(attachment): attachment is InstanceAiAgentAttachment => attachment.type === 'agent',
		);

		const nodeAttachments = attachmentsOrEmpty.filter(
			(attachment): attachment is InstanceAiNodesAttachment => attachment.type === 'nodes',
		);

		return [
			...workflowAttachments,
			...agentAttachments,
			...(nodeContextEnabled ? nodeAttachments : []),
		];
	}

	/**
	 * Run body for a fresh orchestrator turn. Never call directly — go through
	 * `startExecuteRun` so the promise is registered with `inFlightExecutions`
	 * and shutdown can drain it before the DB closes.
	 */
	// eslint-disable-next-line complexity
	/** Thread provenance for the trace. Best-effort by construction: a failed
	 *  metadata read must not take the run with it — the trace just loses a
	 *  label it would have been nice to have. */
	private async readThreadProvenance(
		userId: string,
		threadId: string,
	): Promise<Record<string, unknown>> {
		try {
			return threadProvenanceMetadata(await this.memoryService.getThreadMetadata(userId, threadId));
		} catch (error) {
			this.logger.debug('Could not read thread provenance for tracing', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return {};
		}
	}

	// ── Agents runtime turn ────────────────────────────────────────────────────
	//
	// The Agents runtime owns the queue, steering, checkpoints, HITL resume and
	// the turn recording. These methods build one Assistant turn for it and run
	// the Assistant-specific work before and after the turn.

	private get agentMemory(): N8nMemoryImpl {
		return this.assistantMemory;
	}

	private get systemAgents(): SystemAgentExecutionService {
		return Container.get(SystemAgentExecutionService);
	}

	/** Memory for the Assistant: the Agents tables, scoped to the Assistant agent. */
	private get assistantMemory(): N8nMemoryImpl {
		return Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID);
	}

	private get assistantCheckpointStore(): CheckpointStore {
		return Container.get(N8NCheckpointStorage).getStorage(ASSISTANT_AGENT_ID);
	}

	private async resolveThreadProjectId(threadId: string): Promise<string | undefined> {
		const thread = await this.systemAgents.findThread(threadId);
		return thread?.projectId;
	}

	/** The SDK creates the memory thread on the first message. Turn setup reads it before that. */
	private async ensureMemoryThread(threadId: string, resourceId: string): Promise<void> {
		const memory = this.assistantMemory;
		if (await memory.getThread(threadId)) return;
		await memory.saveThread({ id: threadId, resourceId, title: '', metadata: {} });
	}

	/** Remember the live run so SSE reconnects on any main can rebuild its card state. */
	private async recordLiveRun(threadId: string, options: AssistantTurnOptions): Promise<void> {
		const { runId } = options;
		const messageGroupId = options.messageGroupId ?? runId;
		this.runState.indexRunInGroup(threadId, messageGroupId, runId);
		await patchThread(this.assistantMemory, {
			threadId,
			update: ({ metadata }) => {
				const previous = metadata?.[LIVE_RUN_METADATA_KEY];
				const previousRunIds =
					isRecord(previous) &&
					previous.messageGroupId === messageGroupId &&
					Array.isArray(previous.runIds)
						? previous.runIds.filter((id): id is string => typeof id === 'string')
						: [];
				const runIds = previousRunIds.includes(runId) ? previousRunIds : [...previousRunIds, runId];
				return {
					metadata: { ...metadata, [LIVE_RUN_METADATA_KEY]: { runId, messageGroupId, runIds } },
				};
			},
		});
	}

	/** Restore per-thread state from the turn options. The queued turn can run on any main. */
	private applyTurnState(threadId: string, options: AssistantTurnOptions): void {
		if (options.timeZone) this.runState.setTimeZone(threadId, options.timeZone);
		this.runState.setComputerUseChannels(threadId, options.computerUseChannels);
		this.runState.setBuildMode(threadId, options.buildMode);
		this.runState.setPromptVersion(threadId, options.promptVersion);
		this.runState.setObserverThresholdTokens(threadId, options.observerThresholdTokens);
		if (options.pushRef !== undefined) this.threadPushRef.set(threadId, options.pushRef);
	}

	private async readTurnDefaults(threadId: string): Promise<AssistantTurnDefaults> {
		const thread = await this.assistantMemory.getThread(threadId);
		const defaults = thread?.metadata?.[ASSISTANT_TURN_DEFAULTS_KEY];
		return isRecord(defaults) ? (defaults as AssistantTurnDefaults) : {};
	}

	private async saveTurnDefaults(threadId: string, defaults: AssistantTurnDefaults): Promise<void> {
		await patchThread(this.assistantMemory, {
			threadId,
			update: ({ metadata }) => ({
				metadata: { ...metadata, [ASSISTANT_TURN_DEFAULTS_KEY]: defaults },
			}),
		});
	}

	/** Queue a turn. The Agents queue runs it, or the caller steers it into the running turn. */
	private async enqueueAssistantTurn(
		user: User,
		threadId: string,
		message: string,
		options: AssistantTurnOptions,
	): Promise<{ runId: string; steered: boolean }> {
		const accepted = await this.systemAgents.sendMessage({
			agentId: ASSISTANT_AGENT_ID,
			user,
			threadId,
			message,
			options: toJsonObject(options),
		});
		if (accepted.status !== 'accepted') return { runId: options.runId, steered: false };
		// A user message during a running turn joins it at the next step boundary.
		const steered =
			options.resumeReason === undefined &&
			(await this.systemAgents.steerIntoRunningTurn(
				await this.systemAgents.getThread(ASSISTANT_AGENT_ID, user, threadId),
				user,
				accepted.item.id,
			));
		return { runId: options.runId, steered };
	}

	/** Build one Assistant turn for the Agents runtime. */
	async prepareAssistantTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle> {
		const options =
			turn.type === 'start'
				? readAssistantTurnOptions(turn.options)
				: readAssistantTurnOptions(turn.checkpointHostMetadata[ASSISTANT_TURN_METADATA_KEY]);
		if (!options.runId) options.runId = `run_${nanoid()}`;
		const threadId = turn.thread.id;
		this.applyTurnState(threadId, options);
		await this.ensureMemoryThread(threadId, turn.resourceId);
		await this.recordLiveRun(threadId, options);
		return turn.type === 'start'
			? await this.prepareStartTurn(turn, options)
			: await this.prepareResumeTurn(turn, options);
	}

	private async prepareStartTurn(
		turn: Extract<SystemAgentTurn, { type: 'start' }>,
		options: AssistantTurnOptions,
	): Promise<SystemAgentTurnHandle> {
		const { user, message } = turn;
		const threadId = turn.thread.id;
		const {
			runId,
			messageGroupId,
			attachments,
			handoffContext,
			timeZone,
			isReplanFollowUp = false,
			checkpoint,
			resumeReason,
			threadArtifacts,
		} = options;
		const plannedBuild: PlannedBuildFollowUp | undefined = options.plannedBuild
			? { ...options.plannedBuild }
			: undefined;
		const signal = turn.abortSignal;
		const fileAttachments = (attachments ?? []).filter(
			(attachment): attachment is InstanceAiFileAttachment => attachment.type === 'file',
		);
		const experimentGates = await this.adapterService.resolveExperimentGates(user);
		const contextAttachments = this.resolveContextAttachments(
			attachments,
			experimentGates.nodeContextEnabled,
		);
		const turnStartedAt = new Date();
		const messageId = nanoid();
		const traceInput: Record<string, unknown> = { message };
		if (fileAttachments.length) {
			traceInput.attachments = fileAttachments.map((attachment) => ({
				mimeType: attachment.mimeType,
				size: attachment.data.length,
			}));
		}
		if (messageGroupId) traceInput.messageGroupId = messageGroupId;

		const proxyRunConfig = await this.createProxyRunConfig(user);
		const browserExtension = this.browserSessionService.getExtensionTraceContext(user.id);
		const threadProvenance = await this.readThreadProvenance(user.id, threadId);
		let tracing: InstanceAiTraceContext | undefined = resumeReason
			? await this.tracing.createOrchestratorResumeTraceContext({
					threadId,
					messageId,
					messageGroupId,
					runId,
					userId: user.id,
					input: traceInput,
					resumeReason,
					metadata: {
						...threadProvenance,
						...(checkpoint?.isCheckpointFollowUp
							? { checkpoint_task_id: checkpoint.checkpointTaskId }
							: {}),
						...(plannedBuild?.isPlannedBuildFollowUp
							? { build_task_id: plannedBuild.buildTaskId }
							: {}),
					},
					browserExtension,
				})
			: await createInstanceAiTraceContext({
					threadId,
					messageId,
					messageGroupId,
					runId,
					userId: user.id,
					input: traceInput,
					metadata: threadProvenance,
					proxyConfig: proxyRunConfig.tracingProxyConfig,
					n8nVersion: N8N_VERSION,
					workflowSdkVersion: WORKFLOW_SDK_VERSION,
					browserExtension,
				});

		const traceId = tracing?.rootRun.otelTraceId;
		const langsmithRunId = tracing?.rootRun.id;
		const langsmithTraceId = tracing?.rootRun.traceId;
		this.eventBus.publish(threadId, {
			type: 'run-start',
			runId,
			agentId: orchestratorAgentId(runId),
			userId: user.id,
			payload: {
				messageId,
				messageGroupId,
				...(traceId ? { traceId } : {}),
				...(langsmithRunId ? { langsmithRunId } : {}),
				...(langsmithTraceId ? { langsmithTraceId } : {}),
			},
		});

		const environment = await this.createExecutionEnvironment(
			user,
			threadId,
			runId,
			signal,
			messageGroupId,
			options.pushRef ?? this.threadPushRef.get(threadId),
			proxyRunConfig,
			undefined,
			experimentGates,
		);
		const {
			context,
			memory,
			taskStorage,
			workflowTasks,
			plannedTaskService,
			modelId,
			orchestrationContext,
			conversationHistory,
			aiPreferencesEnabled,
			instanceContextEnabled,
			nodeUsageEnabled,
		} = environment;
		const promptVersion = orchestrationContext.promptConfiguration?.version;
		setTracePromptVersion(tracing, promptVersion);
		setTraceModelId(tracing, modelId);
		const aiCreatedWorkflowIds = (context.aiCreatedWorkflowIds ??= new Set<string>());
		const isPostPlanFollowUp = isReplanFollowUp || checkpoint?.isCheckpointFollowUp === true;
		orchestrationContext.currentUserMessage = message;
		orchestrationContext.isReplanFollowUp = isReplanFollowUp;
		orchestrationContext.timeZone = timeZone ?? this.defaultTimeZone;

		if (checkpoint?.isCheckpointFollowUp) {
			orchestrationContext.isCheckpointFollowUp = true;
			orchestrationContext.checkpointTaskId = checkpoint.checkpointTaskId;
			context.permissions = {
				...context.permissions,
				...(PLANNED_TASK_PERMISSION_OVERRIDES.checkpoint ?? {}),
			} as typeof context.permissions;
			const runPolicy = await this.getCheckpointRunPolicy(threadId, checkpoint.checkpointTaskId);
			context.allowedRunWorkflowIds = runPolicy.allowedWorkflowIds;
			context.allowedRunWorkflowNames = runPolicy.allowedWorkflowNames;
			context.requireRunWorkflowApproval = runPolicy.requireApproval;
		}

		if (plannedBuild?.isPlannedBuildFollowUp) {
			context.permissions = {
				...context.permissions,
				...(PLANNED_TASK_PERMISSION_OVERRIDES['build-workflow'] ?? {}),
			} as typeof context.permissions;
			context.workflowBuildContext = {
				threadId,
				runId,
				taskId: plannedBuild.buildTaskId,
				workItemId: plannedBuild.workItemId,
				allowPostPlanWorkflowCreate: true,
				isSupportingWorkflowTask: plannedBuild.isSupportingWorkflowTask,
				plannedTaskService,
				workflowTaskService: workflowTasks,
				onBuildOutcome: (outcome) => {
					plannedBuild.savedOutcome = outcome;
				},
			};
		} else {
			context.workflowBuildContext = {
				threadId,
				runId,
				taskId: `build-${runId}`,
				workItemId: `wi_${nanoid(8)}`,
				allowPostPlanWorkflowCreate: isPostPlanFollowUp,
				workflowTaskService: workflowTasks,
			};
		}
		if (fileAttachments.length > 0) context.currentUserAttachments = fileAttachments;

		if (!tracing && process.env.E2E_TESTS === 'true') {
			const { createTraceReplayOnlyContext } = await lazyImport<typeof import('@n8n/instance-ai')>(
				async () => await import('@n8n/instance-ai'),
			);
			tracing = createTraceReplayOnlyContext();
		}
		if (tracing) {
			orchestrationContext.tracing = tracing;
			if (this.tracing.getTraceContext(runId) !== tracing) {
				await this.tracing.configureTraceReplayMode(tracing);
				this.tracing.storeTraceContext(runId, threadId, tracing, messageGroupId);
			}
		}
		await this.snapshotAttachedAgents(contextAttachments, orchestrationContext, tracing);

		let handoffContextBlock = '';
		let agentPreviewTitleFallback: string | undefined;
		if (handoffContext?.source === 'agent-preview') {
			const projectId = context.projectId;
			if (!projectId) throw new UnexpectedError('Agent-preview handoff requires a project');
			await this.assertAgentPreviewHandoffScopes(user, projectId);
			const agentExecutionService = this.getAgentExecutionService();
			if (!agentExecutionService) throw new UserError('Agent preview handoff is not available');
			const resolved = await resolveAgentPreviewHandoff(handoffContext, {
				projectId,
				userId: user.id,
				getThreadDetail: agentExecutionService.getThreadDetail.bind(agentExecutionService),
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
		const setupStateBlock =
			resumeReason === undefined ? await this.buildWorkflowSetupStateBlock(context) : '';

		const thread = await memory.getThread(threadId);
		const unopenedOnboarding =
			thread?.metadata?.source === 'onboarding' && !thread.metadata.titleRefined;
		const isOpeningTurn = Boolean(thread && (!thread.title || unopenedOnboarding));
		const onboardingSkill = unopenedOnboarding ? await loadOnboardingSkill() : undefined;
		if (isOpeningTurn) {
			const handoffTitle = unopenedOnboarding
				? ONBOARDING_OPENING.title
				: (contextAttachments.find(isNamedResourceAttachment)?.name ?? agentPreviewTitleFallback);
			const title = handoffTitle
				? truncateToTitle(handoffTitle)
				: truncateToTitle(message) || truncateToTitle(fileAttachments[0]?.fileName ?? '');
			await patchThread(memory, {
				threadId,
				update: ({ metadata }) => ({
					title,
					metadata: handoffTitle ? { ...metadata, titleRefined: true } : metadata,
				}),
			});
			await this.syncThreadTitle(threadId, title);
		}

		const isMachineFollowUp =
			checkpoint?.isCheckpointFollowUp === true || plannedBuild?.isPlannedBuildFollowUp === true;
		const instanceContext = await this.instanceContext.buildBlock({
			user,
			scope: {
				surface: 'conversation',
				...(context.projectId !== undefined ? { projectId: context.projectId } : {}),
			},
			cursor: readInstanceContextCursor(thread?.metadata),
			isMachineFollowUp,
			enabled: instanceContextEnabled,
		});
		const contextInjection = toContextInjection(instanceContext);
		const contextTurn: InstanceContextTurnBinding = {
			userId: user.id,
			threadId,
			runId,
			injection: contextInjection,
			instanceContextEnabled,
			nodeUsageEnabled,
		};
		if (shouldTraceContextInjection(contextInjection)) {
			this.eventBus.publish(threadId, {
				type: 'instance-context',
				runId,
				agentId: orchestratorAgentId(runId),
				payload: { injection: contextInjection },
			});
		}
		const existingTasks = await taskStorage.get(threadId);
		if (existingTasks) {
			this.eventBus.publish(threadId, {
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
			hasParseableAttachment = classifiedAttachments.some(
				(attachment: { parseable: boolean }) => attachment.parseable,
			);
			attachmentManifest = buildAttachmentManifest(classifiedAttachments);
		}
		const turnHadFileAttachments = nonStructuredAttachments.length > 0;
		const enrichedMessage = message;
		const messageBody =
			!message && hasParseableAttachment
				? `The user attached file(s) without a message. Inspect the first parseable attachment with parse-file and provide a concise summary.\n\n${attachmentManifest}`
				: attachmentManifest
					? `${enrichedMessage}\n\n${attachmentManifest}`
					: enrichedMessage;

		let replayedHistory: Promise<AgentDbMessage[]> | undefined;
		const loadReplayedHistory = async () =>
			await (replayedHistory ??= this.getReplayedMessages(threadId));
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
		const aiPreferencesTurn =
			aiPreferencesEnabled && resumeReason === undefined && !isMachineFollowUp
				? await this.resolveAiPreferencesTurn(user.id, boundProject, threadId, loadReplayedHistory)
				: undefined;
		const threadContextBlock = buildThreadContextBlock([
			instanceContext.state === 'injected' ? instanceContext.block : '',
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
		const input: string | Message[] =
			nonStructuredAttachments.length > 0
				? [
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
					]
				: fullMessage;

		if (tracing && tracing.actorRun.id === tracing.rootRun.id) {
			const actorRun = await tracing.startChildRun(tracing.rootRun, {
				name: 'agent: orchestrator',
				canonicalName: 'instance-ai.agent.orchestrator',
				tags: ['orchestrator'],
				metadata: {
					agent_role: 'orchestrator',
					agent_id: orchestratorAgentId(runId),
					execution_mode: 'foreground',
					trace_kind: tracing.traceKind,
				},
				inputs: traceInput,
			});
			tracing.actorRun = actorRun;
			tracing.orchestratorRun = actorRun;
		}

		const runControl = createOrchestratorRunControl(orchestrationContext);
		const agent = await this.createAgentFromEnvironment(
			environment,
			threadId,
			runId,
			user,
			tracing,
		);

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
		if (aiPreferencesTurn) {
			this.eventBus.publish(threadId, {
				type: 'preferences-applied',
				runId,
				agentId: orchestratorAgentId(runId),
				userId: user.id,
				payload: aiPreferencesTurn.payload,
			});
		}
		if (resumeReason === undefined) {
			await this.saveTurnDefaults(threadId, {
				timeZone: options.timeZone,
				pushRef: options.pushRef,
				computerUseChannels: options.computerUseChannels,
			});
		}

		return this.createTurnHandle({
			user,
			threadId,
			runId,
			messageId,
			messageGroupId,
			options,
			agent,
			input,
			tracing,
			modelId,
			promptVersion,
			aiCreatedWorkflowIds,
			runControl,
			checkpoint,
			plannedBuild,
			resumeReason,
			contextTurn,
			aiPreferencesTurn,
			turnStartedAt,
			turnHadFileAttachments,
			hideUserMessage: resumeReason !== undefined,
		});
	}

	private async prepareResumeTurn(
		turn: Extract<SystemAgentTurn, { type: 'resume' }>,
		options: AssistantTurnOptions,
	): Promise<SystemAgentTurnHandle> {
		const { user } = turn;
		const threadId = turn.thread.id;
		const { runId, messageGroupId, checkpoint, resumeReason } = options;
		const plannedBuild: PlannedBuildFollowUp | undefined = options.plannedBuild
			? { ...options.plannedBuild }
			: undefined;
		const resumeData = isRecord(turn.resumeData) ? turn.resumeData : {};
		const tracing = await this.tracing.createOrchestratorResumeTraceContext({
			threadId,
			messageId: nanoid(),
			messageGroupId,
			runId,
			userId: user.id,
			input: { toolCallId: turn.toolCallId, resumeFields: Object.keys(resumeData) },
			resumeReason: 'approval',
			metadata: {
				...(await this.readThreadProvenance(user.id, threadId)),
				pending_tool_call_id: turn.toolCallId,
			},
			browserExtension: this.browserSessionService.getExtensionTraceContext(user.id),
		});
		const checkpointState = await this.assistantCheckpointStore.load(turn.runId);
		const pending = Object.values(checkpointState?.pendingToolCalls ?? {}).find(
			(toolCall) => toolCall.toolCallId === turn.toolCallId,
		);
		const pendingPayload =
			pending?.suspended && isRecord(pending.suspendPayload) ? pending.suspendPayload : undefined;
		const environment = await this.createExecutionEnvironment(
			user,
			threadId,
			runId,
			turn.abortSignal,
			messageGroupId,
			options.pushRef ?? this.threadPushRef.get(threadId),
			undefined,
			undefined,
			undefined,
			this.isAgentBuilderSuspension(pending?.toolName, pendingPayload),
		);
		const { context, orchestrationContext, modelId } = environment;
		const promptVersion = orchestrationContext.promptConfiguration?.version;
		const aiCreatedWorkflowIds = (context.aiCreatedWorkflowIds ??= new Set<string>());
		if (checkpoint?.isCheckpointFollowUp) {
			orchestrationContext.isCheckpointFollowUp = true;
			orchestrationContext.checkpointTaskId = checkpoint.checkpointTaskId;
			context.permissions = {
				...context.permissions,
				...(PLANNED_TASK_PERMISSION_OVERRIDES.checkpoint ?? {}),
			} as typeof context.permissions;
		}
		if (plannedBuild?.isPlannedBuildFollowUp) {
			context.permissions = {
				...context.permissions,
				...(PLANNED_TASK_PERMISSION_OVERRIDES['build-workflow'] ?? {}),
			} as typeof context.permissions;
			context.workflowBuildContext = {
				threadId,
				runId,
				taskId: plannedBuild.buildTaskId,
				workItemId: plannedBuild.workItemId,
				allowPostPlanWorkflowCreate: true,
				isSupportingWorkflowTask: plannedBuild.isSupportingWorkflowTask,
				plannedTaskService: environment.plannedTaskService,
				workflowTaskService: environment.workflowTasks,
				onBuildOutcome: (outcome) => {
					plannedBuild.savedOutcome = outcome;
				},
			};
		}
		if (tracing) {
			orchestrationContext.tracing = tracing;
			this.tracing.storeTraceContext(runId, threadId, tracing, messageGroupId);
		}
		const runControl = createOrchestratorRunControl(orchestrationContext);
		const agent = await this.createAgentFromEnvironment(
			environment,
			threadId,
			runId,
			user,
			tracing,
		);
		return this.createTurnHandle({
			user,
			threadId,
			runId,
			messageId: nanoid(),
			messageGroupId,
			options,
			agent,
			tracing,
			modelId,
			promptVersion,
			aiCreatedWorkflowIds,
			runControl,
			checkpoint,
			plannedBuild,
			resumeReason,
			turnStartedAt: new Date(),
			turnHadFileAttachments: false,
			hideUserMessage: true,
		});
	}

	private createTurnHandle(params: {
		user: User;
		threadId: string;
		runId: string;
		messageId: string;
		messageGroupId?: string;
		options: AssistantTurnOptions;
		agent: InstanceAgent;
		input?: string | Message[];
		tracing: InstanceAiTraceContext | undefined;
		modelId: ModelConfig;
		promptVersion?: string;
		aiCreatedWorkflowIds: Set<string>;
		runControl: ReturnType<typeof createOrchestratorRunControl>;
		checkpoint?: AssistantTurnOptions['checkpoint'];
		plannedBuild?: PlannedBuildFollowUp;
		resumeReason?: OrchestratorResumeReason;
		contextTurn?: InstanceContextTurnBinding;
		aiPreferencesTurn?: Awaited<ReturnType<InstanceAiService['resolveAiPreferencesTurn']>>;
		turnStartedAt: Date;
		turnHadFileAttachments: boolean;
		hideUserMessage: boolean;
	}): SystemAgentTurnHandle {
		const { threadId, runId, runControl } = params;
		const stopController = new AbortController();
		const publisher = new AgentChunkPublisher({
			threadId,
			runId,
			agentId: orchestratorAgentId(runId),
			eventBus: this.eventBus,
			shouldStop: () => runControl.getStopSignal() !== undefined,
			onStop: () => stopController.abort('planned-tasks-scheduled'),
		});
		return {
			agent: params.agent,
			input: params.input,
			hideUserMessage: params.hideUserMessage,
			hostMetadata: {
				[ASSISTANT_TURN_METADATA_KEY]: toJsonObject({ ...params.options, runId }),
				buildMode: this.runState.getBuildMode(threadId) ?? null,
				promptVersion: this.runState.getPromptVersion(threadId) ?? null,
			} as JSONObject,
			runOptions: {
				maxIterations: MAX_STEPS.ORCHESTRATOR,
				recoverUsageOnAbort: true,
				...modelStreamStallOptions(this.aiConfig),
				providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
				abortSignal: stopController.signal,
			},
			onChunk: (chunk) => publisher.observe(chunk),
			onSettled: async (outcome) => {
				await this.settleAssistantTurn(params, publisher, outcome);
			},
		};
	}

	/** The Assistant work after a turn ends or suspends. */
	private async settleAssistantTurn(
		params: Parameters<InstanceAiService['createTurnHandle']>[0],
		publisher: AgentChunkPublisher,
		outcome: SystemAgentTurnOutcome,
	): Promise<void> {
		const { user, threadId, runId, messageGroupId, messageId, tracing, modelId, promptVersion } =
			params;
		const result = publisher.result();
		const status: 'completed' | 'cancelled' | 'errored' | 'suspended' =
			result.stopped && outcome.status === 'cancelled'
				? 'completed'
				: outcome.status === 'suspended' || result.suspension
					? 'suspended'
					: outcome.status === 'cancelled'
						? 'cancelled'
						: outcome.status === 'errored' || result.hasError
							? 'errored'
							: 'completed';
		const contextReach = deriveInstanceContextReach(result.workSummary?.toolCalls ?? []);
		let traceFinalization: MessageTraceFinalization | undefined;
		try {
			if (params.aiPreferencesTurn) {
				this.telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCES_APPLIED_TO_TURN, {
					user_id: user.id,
					count: params.aiPreferencesTurn.payload.preferences.length,
					scope_types: [
						...new Set(params.aiPreferencesTurn.payload.preferences.map((p) => p.scope)),
					],
					rendered_length: params.aiPreferencesTurn.payload.renderedLength,
					surface: 'aia',
					injected_this_turn: params.aiPreferencesTurn.payload.injectedThisTurn,
					turn_latency_ms: Date.now() - params.turnStartedAt.getTime(),
					...(result.usage ? { turn_token_count: result.usage.promptTokens } : {}),
				});
			}

			if (status === 'suspended') {
				this.emitRunMetrics('suspended', {
					modelId,
					workSummary: result.workSummary,
					usage: result.usage,
				});
				if (params.contextTurn) {
					this.emitInstanceContextTurn(params.contextTurn, {
						segment: 'suspended',
						status: 'suspended',
						reach: contextReach,
						workSummary: result.workSummary,
						usage: result.usage,
					});
				}
				if (result.suspension) {
					void this.creditService.claimRunUsage(
						user,
						threadId,
						`${outcome.executionId ?? runId}:${result.suspension.requestId}`,
						result.usage?.usage ?? [],
						'suspended',
					);
				}
				const waitingDecision = await this.terminalOutcome.evaluateWaitingResponse(
					threadId,
					runId,
					result.confirmationEvent,
					{ messageGroupId, correlationId: messageId },
				);
				if (waitingDecision?.reason !== 'confirmation-invalid') {
					const confirmation = publisher.flushConfirmation();
					if (confirmation) this.trackConfirmationRequest(user.id, threadId, confirmation);
				}
				const suspensionOutputs = buildSuspensionTraceOutputs(runId, result.suspension);
				await this.tracing.finalizeRunTracing(runId, tracing, {
					status: 'suspended',
					outputs: suspensionOutputs,
					metadata: { completion_source: 'orchestrator' },
				});
				traceFinalization = {
					status: 'suspended',
					outputs: suspensionOutputs,
					metadata: { completion_source: 'orchestrator' },
				};
				return;
			}

			const terminalError =
				status === 'errored'
					? await this.reclassifyMaskedStreamFailure(result.error ?? outcome.error, user, {
							threadId,
							runId,
						})
					: undefined;
			if (status === 'errored') {
				this.instanceAiErrorReporter.report(
					terminalError ?? new Error('Instance AI stream errored'),
					{
						component: 'instance-ai-stream',
						providerStream: true,
						threadId,
						runId,
						tracing,
						agentId: orchestratorAgentId(runId),
						userId: user.id,
						messageGroupId,
						messageId,
					},
				);
			}
			const attachmentRemoved = this.shouldDropTurnAttachments({
				turnHadAttachments: params.turnHadFileAttachments,
				producedNoOutput: status === 'errored' && result.text.length === 0,
			})
				? await this.dropTurnAttachments({
						threadId,
						resourceId: this.systemAgents.resourceIdFor(user),
					})
				: undefined;
			const userFacingErrorMessage =
				status === 'errored'
					? getUserFacingErrorMessage(terminalError, undefined, { attachmentRemoved })
					: undefined;
			const userFacingErrorCode =
				status === 'errored' ? getUserFacingErrorCode(terminalError) : undefined;
			if (!result.stopped) {
				await this.terminalOutcome.evaluateTerminalResponse(threadId, runId, status, {
					messageGroupId,
					correlationId: messageId,
					workSummary: result.workSummary,
					errorMessage: userFacingErrorMessage,
					errorCode: userFacingErrorCode,
					suppressCompletedFallback:
						params.checkpoint?.isCheckpointFollowUp === true ||
						params.plannedBuild?.isPlannedBuildFollowUp === true,
				});
			}
			const finalStatus = status === 'errored' ? 'error' : status;
			await this.tracing.finalizeRunTracing(runId, tracing, {
				status: finalStatus,
				outputText: result.text,
				modelId,
			});
			traceFinalization = {
				status: finalStatus,
				outputText: result.text,
				modelId,
				metadata: await this.tracing.buildMessageTraceMetadata(threadId, runId, {
					status: finalStatus,
				}),
			};
			const archivedWorkflowIds = await this.temporaryWorkflowService.reapForRun(
				threadId,
				user,
				params.aiCreatedWorkflowIds,
				0,
			);
			if (params.contextTurn) {
				this.emitInstanceContextTurn(params.contextTurn, {
					segment: 'whole',
					status,
					reach: contextReach,
					workSummary: result.workSummary,
					usage: result.usage,
				});
			}
			await this.finalizeRun(threadId, runId, status, {
				promptVersion,
				userId: user.id,
				modelId,
				archivedWorkflowIds,
				workSummary: result.workSummary,
				usage: result.usage,
				contextReach,
				errorReason: status === 'cancelled' ? 'user_cancelled' : userFacingErrorMessage,
				...(status === 'errored'
					? {
							errorInfo: {
								errorMessage: terminalError
									? getErrorMessage(terminalError)
									: 'Instance AI stream errored',
								errorSource: 'stream' as const,
							},
						}
					: {}),
			});
			await this.creditService.claimRunUsage(
				user,
				threadId,
				outcome.executionId ?? runId,
				result.usage?.usage ?? [],
				status,
			);
			if (status === 'completed') {
				this.telemetry.track('Builder sent message', {
					thread_id: threadId,
					...(promptVersion ? { prompt_version: promptVersion } : {}),
					message: redactTelemetryText(result.text),
				});
			}
		} finally {
			if (traceFinalization && tracing) {
				await this.tracing.finalizeMessageTraceRoot(runId, tracing, traceFinalization);
			}
			this.domainAccessTrackersByThread.get(threadId)?.clearRun(runId);
			this.updateInternalFollowUpFailureStreak(
				threadId,
				traceFinalization?.status,
				params.resumeReason !== undefined,
			);
			if (status !== 'suspended') {
				const reschedule = status !== 'cancelled';
				if (params.checkpoint?.isCheckpointFollowUp) {
					await this.finalizeCheckpointFollowUp(
						user,
						threadId,
						params.checkpoint.checkpointTaskId,
						{ reschedule },
					);
				} else if (params.plannedBuild?.isPlannedBuildFollowUp) {
					await this.finalizePlannedBuildFollowUp(user, threadId, params.plannedBuild, {
						reschedule,
					});
				} else if (reschedule) {
					await this.schedulePlannedTasks(user, threadId);
				}
				await this.taskProjector.syncFromWorkflowLoop(threadId, runId);
				if (reschedule) await this.maybeStartWorkflowSetupFollowUp(user, threadId);
			}
		}
	}

	/** Keep the session list title in sync with the memory thread title. */
	private async syncThreadTitle(threadId: string, title: string): Promise<void> {
		if (!title) return;
		try {
			await Container.get(AgentExecutionThreadRepository).updateOwned(threadId, { title });
		} catch (error) {
			this.logger.warn('Failed to sync Assistant thread title', { threadId, error });
		}
	}

	/**
	 * Post-run cleanup for a checkpoint follow-up. Ensures the checkpoint task is
	 * terminal (marking it failed if the orchestrator abandoned it) and re-ticks
	 * the scheduler so the next planned action can fire.
	 */
	private async finalizeCheckpointFollowUp(
		user: User,
		threadId: string,
		checkpointTaskId: string,
		{ reschedule = true }: { reschedule?: boolean } = {},
	): Promise<void> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const task = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (task && task.status === 'running') {
				this.logger.warn('Checkpoint run ended without reporting completion — marking failed', {
					threadId,
					checkpointTaskId,
				});
				await plannedTaskService.markCheckpointFailed(threadId, checkpointTaskId, {
					error: 'Checkpoint run ended without reporting completion',
				});
				const nextGraph = await plannedTaskService.getGraph(threadId);
				if (nextGraph) {
					await this.syncPlannedTasksToUi(threadId, nextGraph);
				}
			}
		} catch (error) {
			this.logger.error('Checkpoint finalization failed', {
				threadId,
				checkpointTaskId,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		if (!reschedule) return;
		await this.schedulePlannedTasks(user, threadId);
	}

	private async finalizePlannedBuildFollowUp(
		user: User,
		threadId: string,
		plannedBuild: PlannedBuildFollowUp,
		{ reschedule = true }: { reschedule?: boolean } = {},
	): Promise<void> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const task = graph?.tasks.find((t) => t.id === plannedBuild.buildTaskId);
			if (task && task.status === 'running') {
				if (plannedBuild.savedOutcome?.submitted === true) {
					await plannedTaskService.markSucceeded(threadId, plannedBuild.buildTaskId, {
						result: plannedBuild.savedOutcome.summary,
						outcome: plannedBuild.savedOutcome,
					});
				} else {
					this.logger.warn('Build workflow follow-up ended without saving — marking failed', {
						threadId,
						buildTaskId: plannedBuild.buildTaskId,
					});
					await plannedTaskService.markFailed(threadId, plannedBuild.buildTaskId, {
						error: 'Workflow build run ended without saving a workflow',
					});
				}
				const nextGraph = await plannedTaskService.getGraph(threadId);
				if (nextGraph) {
					await this.syncPlannedTasksToUi(threadId, nextGraph);
				}
			}
		} catch (error) {
			this.logger.error('Build workflow finalization failed', {
				threadId,
				buildTaskId: plannedBuild.buildTaskId,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		if (!reschedule) return;
		await this.schedulePlannedTasks(user, threadId);
	}

	/** Answer a HITL card. The Agents runtime resumes the suspended turn from its checkpoint. */
	async resolveConfirmation(
		requestingUserId: string,
		requestId: string,
		request: InstanceAiConfirmRequest,
		threadId?: string,
	): Promise<InstanceAiConfirmResponse | null> {
		const user = await this.revalidateActiveUser(requestingUserId);
		if (!user || !threadId) return null;
		const data = toConfirmationData(request);
		const status = await this.systemAgents.getStatus(
			await this.systemAgents.getThread(ASSISTANT_AGENT_ID, user, threadId),
		);
		const pending = Object.values(status.checkpoint?.pendingToolCalls ?? {}).find(
			(toolCall) =>
				toolCall.suspended &&
				isRecord(toolCall.suspendPayload) &&
				toolCall.suspendPayload.requestId === requestId,
		);
		if (!pending) {
			this.logger.debug('Confirmation target not found', { requestId, threadId });
			return null;
		}
		const options = readAssistantTurnOptions(
			status.checkpoint?.persistence?.hostMetadata?.[ASSISTANT_TURN_METADATA_KEY],
		);
		await this.systemAgents.resume({
			agentId: ASSISTANT_AGENT_ID,
			user,
			threadId,
			toolCallId: pending.toolCallId,
			resumeData: buildResumeData(data),
		});
		return { ok: true, ...(options.runId ? { runId: options.runId } : {}) };
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

	private async createAgentFromEnvironment(
		environment: Awaited<ReturnType<InstanceAiService['createExecutionEnvironment']>>,
		threadId: string,
		runId: string,
		user: User,
		tracing: InstanceAiTraceContext | undefined,
	): Promise<InstanceAgent> {
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
			memoryConfig: this.createAgentMemoryOptions(user, threadId, runId),
			memory: environment.memory,
			checkpointStore: this.assistantCheckpointStore,
			onMemoryTaskEvent: this.memoryTaskObserverFor(threadId, tracing),
			thinkingEnabled: this.instanceAiConfig.thinkingEnabled,
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
			this.eventBus.publish(threadId, {
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

	private isAgentBuilderSuspension(
		toolName: string | undefined,
		suspendPayload: Record<string, unknown> | undefined,
	): boolean {
		if (toolName !== 'build-agent') return false;
		const builderCheckpoint = suspendPayload?.builderCheckpoint;
		return (
			isRecord(builderCheckpoint) &&
			typeof builderCheckpoint.runId === 'string' &&
			typeof builderCheckpoint.toolCallId === 'string'
		);
	}

	private async revalidateActiveUser(userId: string): Promise<User | null> {
		try {
			const user = await this.userRepository.findOne({
				where: { id: userId },
				relations: ['role'],
			});
			if (!user || user.disabled) return null;
			const hasInstanceAiMessageScope =
				user.role?.scopes?.some((scope) => scope.slug === 'instanceAi:message') ?? false;
			return hasInstanceAiMessageScope ? user : null;
		} catch (error: unknown) {
			this.logger.warn('Failed to revalidate user', {
				userId,
				error: getErrorMessage(error),
			});
			return null;
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

			this.logger.warn('Instance AI could not name the bound project for this turn', {
				projectId,
				reason: context.workspaceService?.getProject ? 'not-readable' : 'no-workspace-adapter',
			});
			return undefined;
		} catch (error) {
			this.logger.warn('Instance AI failed to resolve the bound project for this turn', {
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
		loadHistory: () => Promise<AgentDbMessage[]> = async () =>
			await this.getReplayedMessages(threadId),
	): Promise<{ block: string | undefined; payload: AiPreferencesAppliedPayload }> {
		const resolved = await this.bestEffort(
			'Instance AI failed to read the AI preferences for this turn',
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
			'Instance AI failed to read the last AI preferences block of this thread',
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
			// A lookup failure only costs the run attribution, never the skip itself.
			const carriedFromRunId = await this.bestEffort(
				'Instance AI failed to resolve which run sent the AI preferences block',
				{ threadId },
				async () => await this.eventLog.getLastPreferencesInjectionRunId(threadId),
			);
			return {
				block: undefined,
				payload: buildAppliedPreferencesPayload({
					preferences,
					renderedLength: freshBlock.length,
					injectedThisTurn: false,
					...(carriedFromRunId ? { carriedFromRunId } : {}),
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
			const block = extractAiPreferencesBlock(this.extractStoredMessageText(m.content));
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
			'Instance AI failed to read the last thread artifacts block of this thread',
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
			const block = extractThreadArtifactsBlock(this.extractStoredMessageText(m.content));
			if (block !== undefined) return block;
		}
		return undefined;
	}

	/**
	 * The persisted messages the runtime replays to the model on the next turn. Mirrors
	 * `MemoryOrchestrator.loadHistoryMessages`, including its desync guard: the post-cursor
	 * window applies only when the cursor AND at least one active observation exist,
	 * otherwise the runtime falls back to the full history. Diverging in the other
	 * direction is safe — a needless re-injection costs one duplicate block, while
	 * trusting a compacted copy silently drops the preferences.
	 */
	private async getReplayedMessages(threadId: string): Promise<AgentDbMessage[]> {
		const cursor = await this.agentMemory.getCursor(threadId);
		if (cursor) {
			const observations = await this.agentMemory.getActiveObservationLog({
				observationScopeId: threadId,
				limit: 1,
				order: 'desc',
			});
			if (observations.length > 0) {
				return await this.agentMemory.getMessagesForObservationScope(threadId, {
					since: {
						sinceCreatedAt: cursor.lastObservedAt,
						sinceMessageId: cursor.lastObservedMessageId,
					},
				});
			}
		}
		return await this.agentMemory.getMessages(threadId);
	}

	private async canAccessAgentPreviewHandoff(user: User, projectId: string): Promise<boolean> {
		const requiredScopes: Scope[] = ['agent:read', 'agent:update'];
		return await userHasScopes(user, requiredScopes, false, { projectId });
	}

	private async assertAgentPreviewHandoffScopes(user: User, projectId: string): Promise<void> {
		if (!(await this.canAccessAgentPreviewHandoff(user, projectId))) {
			throw new ForbiddenError(
				'You do not have permission to load or edit agent previews in this project.',
			);
		}
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

	/** Snapshot every Agent the editor attached, as it stands before this turn
	 *  acts on it. Best-effort: it only feeds eval-seed authoring. */
	private async snapshotAttachedAgents(
		attachments: InstanceAiResourceAttachment[],
		orchestrationContext: OrchestrationContext,
		tracing: InstanceAiTraceContext | undefined,
	): Promise<void> {
		const delegate = orchestrationContext.domainContext?.builderDelegate;
		if (!delegate || !tracing) return;
		for (const attachment of attachments) {
			if (attachment.type !== 'agent') continue;
			let artifact: AgentSnapshotArtifact | null = null;
			try {
				artifact = (await delegate.readAgentArtifact?.(attachment.id)) ?? null;
			} catch (error) {
				this.logger.debug(
					`[agent-snapshot] attached read for ${attachment.id} failed: ${error instanceof Error ? error.message : String(error)}`,
				);
				continue;
			}
			if (!artifact) continue;
			await emitAgentSnapshotTraceEvent(tracing, {
				agentId: attachment.id,
				projectId: attachment.projectId,
				reason: 'attached',
				artifact,
				logger: this.logger,
			});
		}
	}

	private trackConfirmationRequest(
		userId: string,
		threadId: string,
		confirmationEvent: { payload: Record<string, unknown> },
	): void {
		const payload = confirmationEvent.payload;
		const inputThreadId = nanoid();
		payload.inputThreadId = inputThreadId;

		const inputType = payload.inputType as string | undefined;
		const mcpConnectServers = mcpConnectRequestSchema.safeParse(payload.mcpConnectRequest).data
			?.servers;
		let type: string;
		if (inputType) {
			type = inputType;
		} else if (Array.isArray(payload.setupRequests) && payload.setupRequests.length > 0) {
			type = 'setup';
		} else if (Array.isArray(payload.credentialRequests) && payload.credentialRequests.length > 0) {
			type = 'credential-setup';
		} else if (mcpConnectServers) {
			type = 'mcp-connect';
		} else {
			type = 'approval';
		}

		let numSteps = 1;
		if (Array.isArray(payload.questions)) {
			numSteps = payload.questions.length;
		} else if (Array.isArray(payload.setupRequests)) {
			numSteps = payload.setupRequests.length;
		} else if (Array.isArray(payload.credentialRequests)) {
			numSteps = payload.credentialRequests.length;
		} else if (mcpConnectServers) {
			numSteps = mcpConnectServers.length;
		}

		if (inputType === 'plan-review') {
			// Tell the first plan in a thread apart from later revisions the user asked
			// for. The per-thread counter is cleared on thread cleanup.
			const planCount = (this.planRequestsByThread.get(threadId) ?? 0) + 1;
			this.planRequestsByThread.set(threadId, planCount);
			type = planCount === 1 ? 'first_plan' : 'revised_plan';
			if (Array.isArray(payload.planItems)) {
				numSteps = payload.planItems.length;
			}
		}

		const credentialRequests = (
			Array.isArray(payload.credentialRequests) ? payload.credentialRequests : []
		).filter(
			(request): request is { credentialType?: unknown; setupHint?: unknown } =>
				typeof request === 'object' && request !== null,
		);

		// Whether any requested credential is a recipe-driven Templated Custom Auth
		// one (recipe-seeded modal), to compare completion against plain types.
		const containsTemplatedCred = credentialRequests.some(
			(request) =>
				request.credentialType === TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE ||
				(request.setupHint !== null && request.setupHint !== undefined),
		);

		this.telemetry.track('Builder asked for input', {
			user_id: userId,
			thread_id: threadId,
			input_thread_id: inputThreadId,
			type,
			num_steps: numSteps,
			contains_templated_cred: containsTemplatedCred,
		});

		// Recipe content at spec time — production visibility into template and
		// link quality (the offline eval suite grades the same fields). One event
		// per recipe; secret-free by construction: recipes are agent-authored
		// before any user input.
		for (const request of credentialRequests) {
			const parsedHint = credentialSetupHintSchema.safeParse(request.setupHint);
			if (!parsedHint.success) continue;
			const hint = parsedHint.data;
			this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.BUILDER_SPECCED_TEMPLATED_CRED, {
				thread_id: threadId,
				input_thread_id: inputThreadId,
				template: hint.template,
				placeholders: hint.placeholders,
				test_url: hint.testUrl,
				docs_url: hint.docsUrl,
				service_host: hint.serviceHost,
				accepted_status_codes: hint.acceptedStatusCodes,
			});
		}
	}

	private publishRunFinish(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
		archivedWorkflowIds?: string[],
		userId?: string,
		metadata?: RunFinishMetadata,
	): void {
		const effectiveStatus = status === 'errored' ? 'error' : status;
		const hasArchived = archivedWorkflowIds && archivedWorkflowIds.length > 0;
		this.eventBus.publish(threadId, {
			type: 'run-finish',
			runId,
			agentId: orchestratorAgentId(runId),
			payload: {
				status: effectiveStatus,
				...(status === 'cancelled'
					? { reason: reason ?? 'user_cancelled' }
					: status === 'errored' && reason
						? { reason }
						: {}),
				...(hasArchived ? { archivedWorkflowIds } : {}),
				...(metadata?.contextReach ? { contextReach: metadata.contextReach } : {}),
			},
		});
		// success-drop heartbeat; user_id required or PostHog drops instance-only events
		this.telemetry.track('instance_ai_run_finished', {
			thread_id: threadId,
			run_id: runId,
			...(metadata?.promptVersion ? { prompt_version: metadata.promptVersion } : {}),
			...this.telemetryModelId(metadata?.modelId),
			status: effectiveStatus,
			...(userId ? { user_id: userId } : {}),
		});
		this.emitBrowserCredentialSetupOutcomes(threadId, runId, status);
		if (status === 'errored') {
			this.telemetry.track('Builder generation errored', {
				thread_id: threadId,
				run_id: runId,
				...(metadata?.promptVersion ? { prompt_version: metadata.promptVersion } : {}),
				...this.telemetryModelId(metadata?.modelId),
				error_message: redactTelemetryText(metadata?.errorMessage ?? reason ?? 'unknown'),
				...(metadata?.errorSource ? { error_source: metadata.errorSource } : {}),
				...(userId ? { user_id: userId } : {}),
			});
		}
	}

	private telemetryModelId(
		modelId: ModelConfig | undefined,
	): { model_id: string } | Record<string, never> {
		const id = modelConfigId(modelId);
		return id ? { model_id: id } : {};
	}

	/**
	 * Per-run bookkeeping behind `context.browserCredentialSetup` (NODE-5511).
	 * `markPending` opens an attempt when the user clicks auto-setup on the
	 * credential card; `markCreated`/`markCreateFailed` resolve the latest open
	 * attempt for the type — or open an implicit `'conversation'` attempt when
	 * there is none, so LLM-initiated creations (user asked directly in chat,
	 * no setup card involved) still produce a terminal telemetry event.
	 */
	private createBrowserCredentialSetupTracker(
		runId: string,
		userId: string,
	): NonNullable<InstanceAiContext['browserCredentialSetup']> {
		const getOrCreateAttempts = () => {
			let pending = this.pendingBrowserCredentialSetups.get(runId);
			if (!pending) {
				pending = { userId, attempts: [] };
				this.pendingBrowserCredentialSetups.set(runId, pending);
			}
			return pending.attempts;
		};
		const resolveOpenAttempt = (credentialType: string) => {
			const attempts = getOrCreateAttempts();
			let attempt = attempts.findLast((a) => a.credentialType === credentialType && !a.created);
			if (!attempt) {
				attempt = {
					credentialType,
					setupMethod: 'conversation',
					startedAt: Date.now(),
					created: false,
				};
				attempts.push(attempt);
			}
			return attempt;
		};
		return {
			markPending: (credentialType: string, attemptId?: string) => {
				const attempts = getOrCreateAttempts();
				if (attemptId && attempts.some((attempt) => attempt.attemptId === attemptId)) {
					return;
				}
				attempts.push({
					credentialType,
					setupMethod: 'setup_card',
					attemptId,
					startedAt: Date.now(),
					created: false,
				});
			},
			markCreated: (credentialType: string) => {
				const attempt = resolveOpenAttempt(credentialType);
				attempt.created = true;
				attempt.errorCode = undefined;
			},
			markCreateFailed: (credentialType: string, errorCode: string) => {
				resolveOpenAttempt(credentialType).errorCode = errorCode;
			},
		};
	}

	/**
	 * Emit one terminal telemetry event per browser-assisted credential setup
	 * attempt of the finished run (NODE-5511). Consumes the pending record so
	 * every attempt yields exactly one success or failure event. When the flow
	 * itself never failed, the run's own termination (user stop or stream
	 * error) is reported as the error code so aborts aren't counted as
	 * flow failures.
	 */
	private emitBrowserCredentialSetupOutcomes(
		threadId: string,
		runId: string,
		runStatus: 'completed' | 'cancelled' | 'errored',
	): void {
		const browserSetup = this.pendingBrowserCredentialSetups.get(runId);
		if (!browserSetup) return;
		this.pendingBrowserCredentialSetups.delete(runId);
		const terminalErrorCode =
			runStatus === 'completed'
				? 'not_attempted'
				: runStatus === 'errored'
					? 'run_errored'
					: 'run_cancelled';
		for (const attempt of browserSetup.attempts) {
			this.telemetry.track('Instance AI Browser Use credential setup completed', {
				user_id: browserSetup.userId,
				credential_type: attempt.credentialType,
				status: attempt.created ? 'success' : 'failure',
				...(attempt.created
					? {}
					: {
							failure_stage: failureStageForErrorCode(attempt.errorCode),
							error_code: attempt.errorCode ?? terminalErrorCode,
						}),
				// The flow never runs a credential test, so validation support is unknown.
				is_valid: null,
				is_new: true,
				setup_method: attempt.setupMethod,
				thread_id: threadId,
				run_id: runId,
				...(attempt.attemptId ? { credential_setup_attempt_id: attempt.attemptId } : {}),
				duration_ms: Date.now() - attempt.startedAt,
			});
		}
	}

	private async finalizeRun(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		options?: {
			userId?: string;
			promptVersion?: string;
			modelId?: ModelConfig;
			archivedWorkflowIds?: string[];
			workSummary?: WorkSummary;
			usage?: RunTokenUsage;
			/** How far the turn went for instance context, for the trace to fold onto its entry. */
			contextReach?: InstanceContextReach;
			errorReason?: string;
			errorInfo?: RunFinishErrorInfo;
		},
	): Promise<void> {
		this.publishRunFinish(
			threadId,
			runId,
			status,
			options?.errorReason,
			options?.archivedWorkflowIds,
			options?.userId,
			{
				...options?.errorInfo,
				promptVersion: options?.promptVersion,
				...(options?.modelId !== undefined ? { modelId: options.modelId } : {}),
				contextReach: options?.contextReach,
			},
		);
		this.emitRunMetrics(status, options);
		if (status === 'completed' && options?.userId && options?.modelId) {
			void this.refineTitleIfNeeded(threadId, options.userId, options.modelId);
		}
	}

	/** Use a fixed estimate to avoid loading a tokenizer on every turn. */
	private static readonly BLOCK_CHARS_PER_TOKEN = 4;

	private emitInstanceContextTurn(
		turn: InstanceContextTurnBinding,
		input: {
			/** A turn can suspend more than once. Aggregate segments by run ID. */
			segment: 'whole' | 'suspended' | 'resumed';
			status: 'completed' | 'cancelled' | 'errored' | 'suspended';
			reach: InstanceContextReach;
			workSummary?: WorkSummary;
			/** Measured usage for this segment, not the estimated block size. */
			usage?: RunTokenUsage;
		},
	): void {
		const { injection } = turn;
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.INSTANCE_CONTEXT_TURN, {
			user_id: turn.userId,
			thread_id: turn.threadId,
			run_id: turn.runId,
			surface: 'aia',
			segment: input.segment,
			instance_context_enabled: turn.instanceContextEnabled,
			node_usage_enabled: turn.nodeUsageEnabled,
			...(injection.state === 'absent'
				? { block_state: injection.state, absence_reason: injection.reason }
				: {
						block_state: injection.state,
						block_is_update: injection.isUpdate,
						block_inventory_rows: injection.legs.inventory,
						block_event_rows: injection.legs.events,
						block_run_rows: injection.legs.runs,
						block_chars: injection.chars,
						// The block is not tokenized separately. Report an estimate beside its exact length.
						block_tokens_estimated: Math.ceil(
							injection.chars / InstanceAiService.BLOCK_CHARS_PER_TOKEN,
						),
					}),
			// Derived here rather than shipped: the depth is a function of the surfaces, and
			// the map that defines it is in scope at the only place that needs a number.
			context_depth: input.reach.surfaces.reduce(
				(deepest, surface) => Math.max(deepest, INSTANCE_CONTEXT_SURFACE_DEPTH[surface]),
				0,
			),
			context_surfaces: input.reach.surfaces,
			asked_clarifying_question: input.workSummary?.askedClarifyingQuestion ?? false,
			tool_calls: input.workSummary?.totalToolCalls ?? 0,
			// A suspended turn spends tokens in each segment, so these are per segment and
			// sum over the shared `run_id`. Absent when the segment reported no usage.
			...(input.usage
				? {
						turn_prompt_tokens: input.usage.promptTokens,
						turn_completion_tokens: input.usage.completionTokens,
						turn_total_tokens: input.usage.totalTokens,
						turn_cost_usd: input.usage.costUsd,
					}
				: {}),
			status: input.status,
		});
	}

	/** Emit a typed event consumed by the Prometheus Instance AI metrics collector. */
	private emitRunMetrics(
		status: 'completed' | 'cancelled' | 'errored' | 'suspended',
		options?: { modelId?: ModelConfig; workSummary?: WorkSummary; usage?: RunTokenUsage },
	): void {
		this.eventService.emit('instance-ai-run-finished', {
			status: status === 'errored' ? 'error' : status,
			durationMs: undefined,
			model: runMetricsModelLabel(options?.modelId),
			toolCalls: options?.workSummary?.totalToolCalls ?? 0,
			toolErrors: options?.workSummary?.totalToolErrors ?? 0,
			...(options?.usage ? { usage: options.usage } : {}),
		});
	}

	/**
	 * Refine the thread title with an LLM-generated version after a run completes.
	 * Fires asynchronously and is best-effort — the heuristic title remains if this fails.
	 */
	private async refineTitleIfNeeded(
		threadId: string,
		userId: string,
		modelId: ModelConfig,
	): Promise<void> {
		try {
			const memory = this.agentMemory;
			const thread = await memory.getThread(threadId);
			if (!thread?.title) return;

			// Skip if thread already has an LLM-refined title
			if (thread.metadata?.titleRefined) return;

			// Title the conversation from its opening user turns.
			const history = await memory.getMessages(threadId, { limit: TITLE_REFINE_HISTORY_LIMIT });
			const userTexts: string[] = [];
			for (const m of history) {
				if (!('role' in m) || m.role !== 'user') continue;
				// Stored user messages carry service-injected blocks (<thread-context>,
				// task context). Strip them or a trivial "hey" looks substantial enough to
				// title, and the injected blocks leak into the title prompt.
				const text = cleanStoredUserMessage(this.extractStoredMessageText(m.content));
				if (text && text.length > 0) userTexts.push(text);
				if (userTexts.length >= 5) break;
			}
			if (userTexts.length === 0) return;
			const userText = userTexts.join('\n');

			const baseTracing = this.tracing.getTraceContextForContinuation(threadId);
			const titleTracing = await createInternalOperationTraceContext({
				threadId,
				conversationId: threadId,
				messageId: `internal:title:${threadId}`,
				runId: `title-${nanoid()}`,
				userId,
				modelId,
				operationName: 'thread_title',
				input: {
					message_count: userTexts.length,
					source: 'thread_title_refinement',
				},
				proxyConfig: baseTracing?.proxyConfig,
				metadata: {
					n8n_version: N8N_VERSION || undefined,
					operation_name: 'thread_title',
					trigger: 'run_completed',
				},
			});
			const titleTelemetry = titleTracing?.getTelemetry?.({
				agentRole: 'thread_title',
				functionId: 'instance-ai.thread_title',
				executionMode: 'internal',
				metadata: {
					operation_name: 'thread_title',
					...modelIdTraceMetadata(modelId),
				},
			});
			let llmTitle: string | null;
			if (titleTracing) {
				try {
					llmTitle = await titleTracing.withActiveSpan(titleTracing.rootRun, async () => {
						const title = await generateTitleForRun(modelId, userText, {
							...(titleTelemetry ? { telemetry: titleTelemetry } : {}),
						});
						if (title) {
							await titleTracing.finishRun(titleTracing.rootRun, {
								outputs: { title },
								metadata: { final_status: 'completed' },
							});
						} else {
							await titleTracing.finishRun(titleTracing.rootRun, {
								outputs: { title: null },
								metadata: { final_status: 'skipped' },
							});
						}
						return title;
					});
				} finally {
					releaseTraceClient(titleTracing.rootRun.traceId);
				}
			} else {
				llmTitle = await generateTitleForRun(modelId, userText);
			}
			if (!llmTitle) return;

			await patchThread(memory, {
				threadId,
				update: ({ metadata }) => ({
					title: llmTitle,
					metadata: { ...metadata, titleRefined: true },
				}),
			});

			// Push SSE event so frontend updates immediately
			this.eventBus.publish(threadId, {
				type: 'thread-title-updated',
				runId: '',
				agentId: 'orchestrator',
				payload: { title: llmTitle },
			});
		} catch (error) {
			this.logger.warn('Failed to refine thread title', {
				threadId,
				error: getErrorMessage(error),
			});
			// Non-fatal — heuristic title remains
		}
	}

	private extractStoredMessageText(content: unknown): string {
		if (typeof content === 'string') return content;
		if (Array.isArray(content)) {
			return content.flatMap((part) => (isTextMessagePart(part) ? [part.text] : [])).join('\n');
		}
		return '';
	}

	/**
	 * Read-own-writes barrier for run-scoped reads: settle the thread's drain
	 * (including open coalesce buffers) so everything published before this call
	 * is visible, then read the log. Every caller is a run boundary —
	 * terminal-guard inputs, trace metadata, snapshot builds — where closing the
	 * open segment early is correct anyway.
	 */
	private async readRunEvents(threadId: string, runIds: string[]): Promise<InstanceAiEvent[]> {
		await this.eventLog.flush(threadId);
		return await this.eventLog.getEventsForRuns(threadId, runIds);
	}

	private parseMcpServers(raw: string): McpServerConfig[] {
		if (!raw.trim()) return [];

		return raw.split(',').map((entry) => {
			const [name, url] = entry.trim().split('=');
			return { name: name.trim(), url: url?.trim() };
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
