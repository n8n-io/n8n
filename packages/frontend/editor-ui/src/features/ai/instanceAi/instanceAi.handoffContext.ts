import type { InstanceAiHandoffContext } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

type AgentPreviewContext = Extract<InstanceAiHandoffContext, { source: 'agent-preview' }>;

type Translate = (key: BaseTextKey, options?: { interpolate: Record<string, string> }) => string;

export function handoffContextKey(context: InstanceAiHandoffContext): string {
	if (context.source === 'agent-preview') {
		const key = `${context.source}:${context.agentId}:${context.threadId}:${context.executionId ?? ''}`;
		// Keep saved dismissal keys valid for handoffs without a session list.
		return context.threadIds?.length ? `${key}:${context.threadIds.join(',')}` : key;
	}

	if (context.source === 'setup-panel-execute') {
		return `${context.source}:${context.workflowId}`;
	}

	if (context.source === 'migration-report') {
		return `${context.source}:${context.ruleId}:${context.workflowId}`;
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
	/**
	 * `threadId` only names the first session of a multi-session handoff, so its
	 * title would suggest that the chip carries that one session.
	 */
	if (context.threadIds && context.threadIds.length > 1) {
		return t('instanceAi.artifactsPanel.context.agentPreviewSessions', {
			interpolate: { count: String(context.threadIds.length) },
		});
	}

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
