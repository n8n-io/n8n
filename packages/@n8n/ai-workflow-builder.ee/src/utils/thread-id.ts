/**
 * Generate a unique thread ID for session management.
 *
 * Extracted as a standalone utility to avoid circular imports between
 * SessionManagerService and code-builder session utilities.
 */
export function generateThreadId(
	workflowId?: string,
	userId?: string,
	agentType?: 'code-builder',
): string {
	const baseId = workflowId
		? `workflow-${workflowId}-user-${userId ?? new Date().getTime()}`
		: crypto.randomUUID();

	return agentType === 'code-builder' ? `${baseId}-code` : baseId;
}
