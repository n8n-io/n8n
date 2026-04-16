import { describe, test, expect, vi } from 'vitest';
import { getToolIcon, useToolLabel } from '../toolLabels';
import type { InstanceAiToolCallState } from '@n8n/api-types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => {
			const translations: Record<string, string> = {
				'instanceAi.tools.search-nodes': 'Search nodes',
				'instanceAi.tools.run-workflow': 'Run workflow',
				'instanceAi.stepTimeline.showData': 'Show data',
				'instanceAi.stepTimeline.hideData': 'Hide data',
				'instanceAi.stepTimeline.showBrief': 'Show brief',
				'instanceAi.stepTimeline.hideBrief': 'Hide brief',
			};
			return translations[key] ?? key;
		},
	}),
}));

function makeToolCall(overrides: Partial<InstanceAiToolCallState> = {}): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'some-tool',
		args: {},
		isLoading: false,
		...overrides,
	};
}

describe('getToolIcon', () => {
	test('returns share for delegate', () => {
		expect(getToolIcon('delegate')).toBe('share');
	});

	test('returns share for tools ending with -with-agent', () => {
		expect(getToolIcon('research-with-agent')).toBe('share');
	});

	test('returns table for data-table tools', () => {
		expect(getToolIcon('create-data-table')).toBe('table');
		expect(getToolIcon('query-data-table-rows')).toBe('table');
	});

	test('returns workflow for workflow-related tools', () => {
		expect(getToolIcon('get-workflow')).toBe('workflow');
		expect(getToolIcon('search-nodes')).toBe('workflow');
		expect(getToolIcon('get-node-description')).toBe('workflow');
		expect(getToolIcon('submit-workflow')).toBe('workflow');
		expect(getToolIcon('run-workflow')).toBe('workflow');
		expect(getToolIcon('list-nodes')).toBe('workflow');
		expect(getToolIcon('list-executions')).toBe('workflow');
		expect(getToolIcon('get-execution')).toBe('workflow');
		expect(getToolIcon('debug-execution')).toBe('workflow');
		expect(getToolIcon('stop-execution')).toBe('workflow');
		expect(getToolIcon('materialize-node-type')).toBe('workflow');
		expect(getToolIcon('explore-node-resources')).toBe('workflow');
		expect(getToolIcon('get-suggested-nodes')).toBe('workflow');
		expect(getToolIcon('activate-workflow')).toBe('workflow');
		expect(getToolIcon('list-workflow-versions')).toBe('workflow');
	});

	test('returns search for web tools', () => {
		expect(getToolIcon('web-search')).toBe('search');
		expect(getToolIcon('fetch-url')).toBe('search');
	});

	test('returns brain for memory/planning tools', () => {
		expect(getToolIcon('updateWorkingMemory')).toBe('brain');
		expect(getToolIcon('plan')).toBe('brain');
	});

	test('returns key-round for credential tools', () => {
		expect(getToolIcon('setup-credentials')).toBe('key-round');
		expect(getToolIcon('delete-credential')).toBe('key-round');
		expect(getToolIcon('browser-credential-setup')).toBe('key-round');
	});

	test('returns settings as default', () => {
		expect(getToolIcon('unknown-tool')).toBe('settings');
	});
});

describe('useToolLabel', () => {
	test('getToolLabel returns translated label when found', () => {
		const { getToolLabel } = useToolLabel();
		expect(getToolLabel('search-nodes')).toBe('Search nodes');
	});

	test('getToolLabel falls back to raw tool name when not found', () => {
		const { getToolLabel } = useToolLabel();
		expect(getToolLabel('unknown-tool')).toBe('unknown-tool');
	});

	test('getToggleLabel returns show data for regular tools', () => {
		const { getToggleLabel } = useToolLabel();
		expect(getToggleLabel(makeToolCall({ toolName: 'get-workflow' }))).toBe('Show data');
	});

	test('getToggleLabel returns show brief for delegate', () => {
		const { getToggleLabel } = useToolLabel();
		expect(getToggleLabel(makeToolCall({ toolName: 'delegate' }))).toBe('Show brief');
	});

	test('getToggleLabel returns undefined for no-toggle tools', () => {
		const { getToggleLabel } = useToolLabel();
		expect(getToggleLabel(makeToolCall({ toolName: 'updateWorkingMemory' }))).toBeUndefined();
		expect(getToggleLabel(makeToolCall({ toolName: 'plan' }))).toBeUndefined();
		expect(getToggleLabel(makeToolCall({ toolName: 'cancel-background-task' }))).toBeUndefined();
	});

	test('getHideLabel returns hide data for regular tools', () => {
		const { getHideLabel } = useToolLabel();
		expect(getHideLabel(makeToolCall({ toolName: 'get-workflow' }))).toBe('Hide data');
	});

	test('getHideLabel returns hide brief for delegate', () => {
		const { getHideLabel } = useToolLabel();
		expect(getHideLabel(makeToolCall({ toolName: 'delegate' }))).toBe('Hide brief');
	});

	test('getHideLabel returns undefined for no-toggle tools', () => {
		const { getHideLabel } = useToolLabel();
		expect(getHideLabel(makeToolCall({ toolName: 'plan' }))).toBeUndefined();
	});
});
