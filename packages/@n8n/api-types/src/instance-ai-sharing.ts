import type { Scope } from '@n8n/permissions';

import type {
	InstanceAiConfirmRequest,
	InstanceAiConfirmRequestKind,
} from './dto/instance-ai/instance-ai-confirm-request.dto';

/**
 * Project scopes that a teammate needs to answer a card in a shared Assistant thread.
 * The answer runs as the thread owner, so the teammate must be able to do the same action
 * in the thread's project. A card without its own entry needs an editor.
 */
const APPROVAL_SCOPES_BY_TOOL: Readonly<Record<string, readonly Scope[]>> = {
	propose_automation: ['workflow:update', 'workflow:publish'],
};

const DEFAULT_APPROVAL_SCOPES: readonly Scope[] = ['workflow:update'];

/** The project scopes that a teammate must hold to answer the card of `toolName`. */
export function sharedThreadApprovalScopes(toolName: string): Scope[] {
	const scopes = Object.hasOwn(APPROVAL_SCOPES_BY_TOOL, toolName)
		? APPROVAL_SCOPES_BY_TOOL[toolName]
		: DEFAULT_APPROVAL_SCOPES;
	return [...scopes];
}

/**
 * Card answers that only decide on what the card shows. The other kinds pick the owner's
 * credentials, connect the owner's integrations, open the owner's computer or send text to
 * the Assistant, so only the owner gives them.
 */
const TEAMMATE_ANSWER_KINDS: ReadonlySet<InstanceAiConfirmRequestKind> = new Set([
	'approval',
	'capabilityDecision',
	'domainAccessApprove',
	'domainAccessDeny',
	'planDeny',
]);

/**
 * Whether a teammate can give `answer` in a shared Assistant thread. A teammate approves or
 * declines a card. Text goes to the Assistant like a message, and only the owner sends those.
 */
export function canTeammateAnswer(answer: InstanceAiConfirmRequest): boolean {
	if (!TEAMMATE_ANSWER_KINDS.has(answer.kind)) return false;
	return answer.kind !== 'approval' || !answer.userInput?.trim();
}
