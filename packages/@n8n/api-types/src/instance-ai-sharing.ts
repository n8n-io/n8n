import type { Scope } from '@n8n/permissions';

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
