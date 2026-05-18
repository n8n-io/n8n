import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';
import type { InstanceAiToolCallState } from '@n8n/api-types';

const NO_TOGGLE_TOOLS = new Set(['updateWorkingMemory', 'plan', 'task-control']);

export function getToolIcon(toolName: string): IconName {
	if (toolName === 'complete-checkpoint') return 'circle-check';
	if (toolName === 'delegate' || toolName.endsWith('-with-agent')) return 'share';
	if (toolName === 'data-tables') return 'table';
	if (
		toolName === 'workflows' ||
		toolName === 'executions' ||
		toolName === 'nodes' ||
		toolName === 'templates'
	)
		return 'workflow';
	if (toolName === 'research') return 'search';
	if (toolName === 'credentials' || toolName === 'browser-credential-setup') return 'key-round';
	if (toolName === 'task-control' || toolName === 'updateWorkingMemory' || toolName === 'plan')
		return 'brain';
	if (toolName === 'filesystem') return 'file-text';
	if (toolName === 'workspace') return 'folder';
	if (toolName.includes('data-table')) return 'table';
	if (
		toolName.includes('workflow') ||
		toolName === 'submit-workflow' ||
		toolName === 'materialize-node-type'
	) {
		return 'workflow';
	}
	if (toolName.includes('credential')) return 'key-round';
	return 'settings';
}

/**
 * Returns a human-readable display label for an instance AI tool name.
 * Falls back to the raw tool name if no mapping exists in i18n.
 */
export function useToolLabel() {
	const i18n = useI18n();

	function getToolLabel(toolName: string, args?: Record<string, unknown>): string {
		const action = typeof args?.action === 'string' ? args.action : undefined;
		if (action) {
			const actionKey = `instanceAi.tools.${toolName}.${action}` as BaseTextKey;
			const actionTranslated = i18n.baseText(actionKey);
			if (actionTranslated !== actionKey) return actionTranslated;
		}
		const key = `instanceAi.tools.${toolName}` as BaseTextKey;
		const translated = i18n.baseText(key);
		return translated === key ? toolName : translated;
	}

	function getToggleLabel(toolCall: InstanceAiToolCallState): string | undefined {
		if (NO_TOGGLE_TOOLS.has(toolCall.toolName)) return undefined;
		if (toolCall.toolName === 'delegate') {
			return i18n.baseText('instanceAi.stepTimeline.showBrief');
		}
		return i18n.baseText('instanceAi.stepTimeline.showData');
	}

	function getHideLabel(toolCall: InstanceAiToolCallState): string | undefined {
		if (NO_TOGGLE_TOOLS.has(toolCall.toolName)) return undefined;
		if (toolCall.toolName === 'delegate') {
			return i18n.baseText('instanceAi.stepTimeline.hideBrief');
		}
		return i18n.baseText('instanceAi.stepTimeline.hideData');
	}

	return { getToolLabel, getToggleLabel, getHideLabel };
}
