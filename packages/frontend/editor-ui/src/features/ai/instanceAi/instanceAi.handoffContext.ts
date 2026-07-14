import type { InstanceAiHandoffContext } from '@n8n/api-types';

export function handoffContextKey(context: InstanceAiHandoffContext): string {
	if (context.source === 'agent-preview') {
		return `${context.source}:${context.agentId}:${context.threadId}:${context.executionId ?? ''}`;
	}

	return `${context.source}:${context.credential.credentialType}:${context.credential.id ?? context.credential.displayName}`;
}

export function getDismissedContextKeys(metadata: Record<string, unknown> | undefined): string[] {
	return Array.isArray(metadata?.dismissedContextKeys)
		? (metadata.dismissedContextKeys as string[])
		: [];
}
