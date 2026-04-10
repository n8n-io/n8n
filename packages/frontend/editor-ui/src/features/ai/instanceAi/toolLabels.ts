import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';
import type { InstanceAiToolCallState } from '@n8n/api-types';

const NO_TOGGLE_TOOLS = new Set(['updateWorkingMemory', 'plan', 'cancel-background-task']);

export function getToolIcon(toolName: string): IconName {
	// Normalize MCP tool names: strip server prefix and convert underscores to hyphens
	const name = toolName.replace(/^n8n-builder_/, '').replace(/_/g, '-');

	if (name === 'delegate' || name.endsWith('-with-agent')) return 'share';
	if (name.includes('data-table')) return 'table';
	if (
		name.includes('workflow') ||
		name === 'search-nodes' ||
		name.startsWith('get-node') ||
		name === 'submit-workflow' ||
		name === 'run-workflow' ||
		name === 'activate-workflow' ||
		name === 'list-nodes' ||
		name === 'explore-node-resources' ||
		name === 'get-suggested-nodes' ||
		name === 'list-executions' ||
		name === 'get-execution' ||
		name === 'debug-execution' ||
		name === 'stop-execution' ||
		name === 'materialize-node-type' ||
		name === 'get-sdk-reference' ||
		name === 'prepare-test-pin-data'
	) {
		return 'workflow';
	}
	if (name === 'web-search' || name === 'fetch-url') return 'search';
	if (name === 'updateWorkingMemory' || name === 'plan') return 'brain';
	if (name.includes('credential') || name === 'browser-credential-setup') return 'key-round';
	if (name === 'search-folders' || name === 'search-projects') return 'search';
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
