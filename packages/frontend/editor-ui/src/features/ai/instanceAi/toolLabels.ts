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
 * Returns the raw tool identifier as backend code sees it — the tool name
 * joined with its action when present, e.g. `workflows.delete`,
 * `data-tables.add-column`. Used as the technical prefix in approval cards
 * so the user can see exactly which tool is about to run.
 */
export function getToolId(toolName: string, args?: Record<string, unknown>): string {
	const action = typeof args?.action === 'string' ? args.action : undefined;
	return action ? `${toolName}.${action}` : toolName;
}

/**
 * Imperative action phrase per tool ID, injected into the unified approval
 * prompt template ("Allow AI Assistant to {action}?") and also stripped
 * from the head of the backend confirmation message so the preview body
 * doesn't repeat the verb. Phrases are kept short and align with the
 * leading verb-noun of the backend message (see
 * `packages/@n8n/instance-ai/src/tools/*.tool.ts`).
 */
const ACTION_PHRASES: Record<string, string> = {
	'workflows.delete': 'archive workflow',
	'workflows.publish': 'publish workflow',
	'workflows.unpublish': 'unpublish workflow',
	'workflows.restore-version': 'restore workflow',
	'executions.run': 'execute workflow',
	'credentials.delete': 'delete credential',
	'data-tables.create': 'create data table',
	'data-tables.delete': 'delete data table',
	'data-tables.add-column': 'add column',
	'data-tables.delete-column': 'delete column',
	'data-tables.rename-column': 'rename column',
	'data-tables.insert-rows': 'insert rows',
	'data-tables.update-rows': 'update rows',
	'data-tables.delete-rows': 'delete rows',
	'workspace.tag-workflow': 'tag workflow',
	'workspace.cleanup-test-executions': 'delete test executions',
	'workspace.create-folder': 'create folder',
	'workspace.delete-folder': 'delete folder',
	'workspace.move-workflow-to-folder': 'move workflow',
	'submit-workflow': 'submit workflow',
	'research.fetch-url': 'fetch URL',
	'filesystem.read': 'read file',
};

export function getToolActionPhrase(
	toolName: string,
	args?: Record<string, unknown>,
): string | undefined {
	return ACTION_PHRASES[getToolId(toolName, args)];
}

/**
 * Strips a leading action phrase (case-insensitive) from a confirmation
 * headline so it can be rendered alongside the heading without verbal
 * duplication. No-op if the headline doesn't start with the phrase.
 */
export function stripActionPrefix(headline: string, phrase: string | undefined): string {
	if (!phrase) return headline;
	const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return headline.replace(new RegExp(`^${escaped}\\s*`, 'i'), '');
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
