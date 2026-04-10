import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';
import type { InstanceAiToolCallState } from '@n8n/api-types';

const NO_TOGGLE_TOOLS = new Set(['updateWorkingMemory', 'plan', 'cancel-background-task']);

export function getToolIcon(toolName: string): IconName {
	if (toolName === 'delegate' || toolName.endsWith('-with-agent')) return 'share';
	if (toolName.includes('data-table')) return 'table';
	if (
		toolName.includes('workflow') ||
		toolName === 'search-nodes' ||
		toolName.startsWith('get-node') ||
		toolName === 'submit-workflow' ||
		toolName === 'run-workflow' ||
		toolName === 'activate-workflow' ||
		toolName === 'list-nodes' ||
		toolName === 'explore-node-resources' ||
		toolName === 'get-suggested-nodes' ||
		toolName === 'list-executions' ||
		toolName === 'get-execution' ||
		toolName === 'debug-execution' ||
		toolName === 'stop-execution' ||
		toolName === 'materialize-node-type'
	) {
		return 'workflow';
	}
	if (toolName === 'web-search' || toolName === 'fetch-url') return 'search';
	if (toolName === 'updateWorkingMemory' || toolName === 'plan') return 'brain';
	if (toolName.includes('credential') || toolName === 'browser-credential-setup')
		return 'key-round';
	return 'settings';
}

/**
 * Returns a human-readable display label for an instance AI tool name.
 * Falls back to the raw tool name if no mapping exists in i18n.
 */
export function useToolLabel() {
	const i18n = useI18n();

	function getToolLabel(toolName: string): string {
		const key = `instanceAi.tools.${toolName}` as BaseTextKey;
		const translated = i18n.baseText(key);
		// If the key is not found, baseText returns the key itself
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
