import type { InstanceAiHandoffContext } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

type AgentPreviewContext = Extract<InstanceAiHandoffContext, { source: 'agent-preview' }>;

type Translate = (key: BaseTextKey, options?: { interpolate: Record<string, string> }) => string;

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

/**
 * Prefer the agent's personalisation icon. Do not gate on `isSupportedIconName` —
 * the agent icon picker allows any Lucide name, and `N8nIcon` already falls back
 * for names outside the curated set.
 */
export function agentPreviewContextIcon(icon?: string): string {
	const trimmed = icon?.trim();
	return trimmed ? trimmed : 'robot';
}

export function formatAgentPreviewContextLabel(
	context: AgentPreviewContext,
	t: Translate,
	artifactName?: string,
): string {
	const carriedName = context.agentName?.trim();
	const carriedTitle = context.sessionTitle?.trim();

	if (carriedName && carriedTitle) {
		return t('instanceAi.artifactsPanel.context.agentPreviewTitled', {
			interpolate: { agentName: carriedName, sessionTitle: carriedTitle },
		});
	}

	if (carriedTitle) {
		return t('instanceAi.artifactsPanel.context.agentPreviewSessionTitled', {
			interpolate: { sessionTitle: carriedTitle },
		});
	}

	const name = carriedName || artifactName?.trim();
	if (name) {
		return t('instanceAi.artifactsPanel.context.agentPreviewNamed', {
			interpolate: { name },
		});
	}

	return t('instanceAi.artifactsPanel.context.agentPreview');
}
