import type {
	DomainAccessAction,
	DomainAccessMeta,
	InstanceAiAgentNode,
	InstanceAiConfirmation,
	InstanceAiConfirmationSeverity,
	InstanceAiMessage,
	InstanceGatewayResourceDecision,
	LocalPermissionPromptRequest,
	ResourceDecision,
	WebSearchMeta,
} from '../../shared/types';

/**
 * How a prompt is answered:
 * - `approval` — approve/deny; `continue` — a single Continue button
 * - `resourceDecision` — computer-use resource access (deny / allow once / allow for session)
 * - `domainAccess` — browser domain access or web search gating
 * - `external` — needs the n8n editor's richer UI (questions, plan review, credentials, setup);
 *   shown non-interactively but still blocks the thread's composer
 */
export type PermissionPromptKind =
	| 'approval'
	| 'continue'
	| 'resourceDecision'
	| 'domainAccess'
	| 'external';

/** Resource-access details, identical for both sources so one card renders either. */
export interface ResourceDecisionDetails {
	resource: string;
	description: string;
	options: readonly ResourceDecision[];
}

interface PromptBase {
	/** Globally unique, source-prefixed — the store dedupes on it. */
	id: string;
	severity: InstanceAiConfirmationSeverity;
	message: string;
}

/** A confirmation raised by an instance-ai thread; answered via the confirm endpoint. */
export interface InstancePermissionPrompt extends PromptBase {
	source: 'instance';
	kind: PermissionPromptKind;
	threadId: string;
	requestId: string;
	toolCallId: string;
	/** The run that raised the prompt; replayed `run-finish` of other runs must not clear it. */
	runId?: string;
	/** The agent that suspended on this prompt — routes the resumed run's deltas in the chat. */
	agentId?: string;
	/** kind 'domainAccess' — one of the two is present. */
	domainAccess?: DomainAccessMeta;
	webSearch?: WebSearchMeta;
	/** kind 'resourceDecision' */
	resourceDecision?: ResourceDecisionDetails;
	/** kind 'external' — lets the chat render the request and answer text-shaped ones inline. */
	inputType?: InstanceAiConfirmation['inputType'];
	questions?: InstanceAiConfirmation['questions'];
	introMessage?: string;
}

/** A computer-use `client`-mode prompt pending in the main process; answered over IPC. */
export interface LocalPermissionPrompt extends PromptBase {
	source: 'local';
	kind: 'resourceDecision';
	localId: string;
	resourceDecision: ResourceDecisionDetails;
}

export type PermissionPrompt = InstancePermissionPrompt | LocalPermissionPrompt;

/** One answer of a Q&A-wizard confirmation (inputType 'questions'). */
export interface QuestionAnswer {
	questionId: string;
	selectedOptions: string[];
	customText?: string;
	skipped?: boolean;
}

/** What the prompt card emits; the store maps it to the confirm body / IPC decision. */
export type PromptResponse =
	| { kind: 'approval'; approved: boolean; userInput?: string }
	| { kind: 'questions'; answers: QuestionAnswer[] }
	| { kind: 'continue' }
	| { kind: 'resourceDecision'; decision: ResourceDecision }
	| { kind: 'domainAccessApprove'; action: DomainAccessAction }
	| { kind: 'domainAccessDeny' };

/**
 * Whether the chat composer can answer this prompt as free text: ask-user
 * style questions and plain text-input confirmations. Other 'external' kinds
 * (plan review, credential/workflow setup) need the n8n editor's rich UI.
 */
export function isChatAnswerable(prompt: PermissionPrompt): prompt is InstancePermissionPrompt {
	if (prompt.source !== 'instance' || prompt.kind !== 'external') return false;
	if (prompt.inputType === 'text') return true;
	return prompt.inputType === 'questions' && (prompt.questions?.length ?? 0) > 0;
}

export function instancePromptId(requestId: string): string {
	return `instance:${requestId}`;
}

export function localPromptId(id: string): string {
	return `local:${id}`;
}

const INSTANCE_RESOURCE_DECISIONS: InstanceGatewayResourceDecision[] = [
	'denyOnce',
	'allowOnce',
	'allowForSession',
];

/** Narrows a card decision to what the instance confirm endpoint accepts. */
export function isInstanceGatewayResourceDecision(
	decision: ResourceDecision,
): decision is InstanceGatewayResourceDecision {
	return (INSTANCE_RESOURCE_DECISIONS as ResourceDecision[]).includes(decision);
}

function classifyKind(confirmation: InstanceAiConfirmation): PermissionPromptKind {
	// Kinds needing the editor's rich flows first — they may carry an inputType too.
	if (
		confirmation.setupRequests?.length ||
		confirmation.credentialRequests?.length ||
		confirmation.credentialFlow
	) {
		return 'external';
	}
	if (confirmation.domainAccess || confirmation.webSearch) return 'domainAccess';
	switch (confirmation.inputType ?? 'approval') {
		case 'resource-decision':
			return confirmation.resourceDecision ? 'resourceDecision' : 'external';
		case 'continue':
			return 'continue';
		case 'approval':
			return 'approval';
		default:
			// text, questions, plan-review
			return 'external';
	}
}

/**
 * Turn a confirmation (SSE `confirmation-request` payload or a snapshot tool-call's
 * embedded confirmation — same shape) into a displayable prompt. `null` when expired.
 */
export function classifyConfirmation(
	threadId: string,
	confirmation: InstanceAiConfirmation,
	context: { toolCallId: string; runId?: string; agentId?: string },
): InstancePermissionPrompt | null {
	if (confirmation.expired) return null;
	const kind = classifyKind(confirmation);
	const prompt: InstancePermissionPrompt = {
		id: instancePromptId(confirmation.requestId),
		source: 'instance',
		kind,
		threadId,
		requestId: confirmation.requestId,
		toolCallId: context.toolCallId,
		runId: context.runId,
		agentId: context.agentId,
		severity: confirmation.severity,
		message: confirmation.message,
	};
	if (kind === 'domainAccess') {
		prompt.domainAccess = confirmation.domainAccess;
		prompt.webSearch = confirmation.webSearch;
	}
	if (kind === 'resourceDecision' && confirmation.resourceDecision) {
		const { resource, description, options } = confirmation.resourceDecision;
		prompt.resourceDecision = { resource, description, options };
	}
	if (kind === 'external') {
		prompt.inputType = confirmation.inputType;
		prompt.questions = confirmation.questions;
		prompt.introMessage = confirmation.introMessage;
	}
	return prompt;
}

/**
 * Pending confirmations embedded in the thread's message snapshot — the restore
 * path after a renderer reload or when a watch starts on a suspended thread.
 */
export function pendingPromptsFromSnapshot(
	threadId: string,
	messages: InstanceAiMessage[],
): InstancePermissionPrompt[] {
	const prompts: InstancePermissionPrompt[] = [];
	for (const message of messages) {
		if (!message.agentTree) continue;
		// A suspended run is the group's latest; older runs in the group are finished.
		const runId = message.runIds?.at(-1) ?? message.runId;
		collectPendingPrompts(threadId, message.agentTree, runId, message.agentTree.agentId, prompts);
	}
	return prompts;
}

function collectPendingPrompts(
	threadId: string,
	node: InstanceAiAgentNode,
	runId: string | undefined,
	rootAgentId: string | undefined,
	prompts: InstancePermissionPrompt[],
): void {
	for (const toolCall of node.toolCalls) {
		if (!toolCall.confirmation || !toolCall.isLoading) continue;
		if (toolCall.confirmationStatus === 'approved' || toolCall.confirmationStatus === 'denied') {
			continue;
		}
		const prompt = classifyConfirmation(threadId, toolCall.confirmation, {
			toolCallId: toolCall.toolCallId,
			runId,
			agentId: rootAgentId,
		});
		if (prompt) prompts.push(prompt);
	}
	for (const child of node.children) {
		collectPendingPrompts(threadId, child, runId, rootAgentId, prompts);
	}
}

/** The renderer-side view of a main-process (computer-use `client`-mode) prompt. */
export function promptFromLocalRequest(
	request: LocalPermissionPromptRequest,
): LocalPermissionPrompt {
	return {
		id: localPromptId(request.id),
		source: 'local',
		kind: 'resourceDecision',
		localId: request.id,
		severity: 'warning',
		message: request.resource.description,
		resourceDecision: {
			resource: request.resource.resource,
			description: request.resource.description,
			options: request.options,
		},
	};
}
