import { describe, test, expect, vi } from 'vitest';
import { getToolIcon, useToolLabel } from '../toolLabels';
import type { InstanceAiToolCallState } from '@n8n/api-types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => {
			const translations: Record<string, string> = {
				'instanceAi.tools.nodes': 'Search nodes',
				'instanceAi.tools.executions': 'Run workflow',
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
		expect(getToolIcon('data-tables')).toBe('table');
	});

	test('returns workflow for workflow-related tools', () => {
		expect(getToolIcon('workflows')).toBe('workflow');
		expect(getToolIcon('executions')).toBe('workflow');
		expect(getToolIcon('nodes')).toBe('workflow');
		expect(getToolIcon('templates')).toBe('workflow');
		expect(getToolIcon('submit-workflow')).toBe('workflow');
		expect(getToolIcon('materialize-node-type')).toBe('workflow');
	});

	test('returns search for research tools', () => {
		expect(getToolIcon('research')).toBe('search');
	});

	test('returns brain for memory/planning tools', () => {
		expect(getToolIcon('updateWorkingMemory')).toBe('brain');
		expect(getToolIcon('plan')).toBe('brain');
		expect(getToolIcon('task-control')).toBe('brain');
	});

	test('returns key-round for credential tools', () => {
		expect(getToolIcon('credentials')).toBe('key-round');
		expect(getToolIcon('browser-credential-setup')).toBe('key-round');
	});

	test('returns file-text for filesystem tools', () => {
		expect(getToolIcon('filesystem')).toBe('file-text');
	});

	test('returns folder for workspace tools', () => {
		expect(getToolIcon('workspace')).toBe('folder');
	});

	test('returns settings as default', () => {
		expect(getToolIcon('unknown-tool')).toBe('settings');
	});
});

describe('useToolLabel', () => {
	test('getToolLabel returns translated label when found', () => {
		const { getToolLabel } = useToolLabel();
		expect(getToolLabel('nodes')).toBe('Search nodes');
	});

	test('getToolLabel falls back to raw tool name when not found', () => {
		const { getToolLabel } = useToolLabel();
		expect(getToolLabel('unknown-tool')).toBe('unknown-tool');
	});

	test('getToggleLabel returns show data for regular tools', () => {
		const { getToggleLabel } = useToolLabel();
		expect(getToggleLabel(makeToolCall({ toolName: 'workflows' }))).toBe('Show data');
	});

	test('getToggleLabel returns show brief for delegate', () => {
		const { getToggleLabel } = useToolLabel();
		expect(getToggleLabel(makeToolCall({ toolName: 'delegate' }))).toBe('Show brief');
	});

	test('getToggleLabel returns undefined for no-toggle tools', () => {
		const { getToggleLabel } = useToolLabel();
		expect(getToggleLabel(makeToolCall({ toolName: 'updateWorkingMemory' }))).toBeUndefined();
		expect(getToggleLabel(makeToolCall({ toolName: 'plan' }))).toBeUndefined();
		expect(getToggleLabel(makeToolCall({ toolName: 'task-control' }))).toBeUndefined();
	});

	test('getHideLabel returns hide data for regular tools', () => {
		const { getHideLabel } = useToolLabel();
		expect(getHideLabel(makeToolCall({ toolName: 'workflows' }))).toBe('Hide data');
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
