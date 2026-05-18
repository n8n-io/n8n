import { describe, test, expect, vi } from 'vitest';
import {
	getToolIcon,
	getToolId,
	getToolActionPhrase,
	stripActionPrefix,
	useToolLabel,
} from '../toolLabels';
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
	test('returns circle-check for complete-checkpoint', () => {
		expect(getToolIcon('complete-checkpoint')).toBe('circle-check');
	});

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

describe('getToolId', () => {
	test('returns the tool name when no action is present', () => {
		expect(getToolId('workflows')).toBe('workflows');
	});

	test('joins tool name and action when present', () => {
		expect(getToolId('workflows', { action: 'delete' })).toBe('workflows.delete');
	});

	test('ignores non-string actions', () => {
		expect(getToolId('workflows', { action: 42 })).toBe('workflows');
	});
});

describe('getToolActionPhrase', () => {
	test('returns the imperative phrase for a known tool+action pair', () => {
		expect(getToolActionPhrase('workflows', { action: 'delete' })).toBe('archive workflow');
		expect(getToolActionPhrase('data-tables', { action: 'add-column' })).toBe('add column');
	});

	test('returns the imperative phrase for a known top-level tool', () => {
		expect(getToolActionPhrase('submit-workflow')).toBe('submit workflow');
	});

	test('returns undefined for unmapped tools', () => {
		expect(getToolActionPhrase('mystery-tool')).toBeUndefined();
		expect(getToolActionPhrase('workflows', { action: 'pet' })).toBeUndefined();
	});
});

describe('stripActionPrefix', () => {
	test('strips the leading phrase case-insensitively', () => {
		expect(stripActionPrefix("Archive workflow 'Foo'?", 'archive workflow')).toBe("'Foo'?");
	});

	test('leaves the headline alone when phrase is undefined', () => {
		expect(stripActionPrefix("Archive workflow 'Foo'?", undefined)).toBe("Archive workflow 'Foo'?");
	});

	test("is a no-op when the headline doesn't start with the phrase", () => {
		expect(stripActionPrefix('Run executions immediately', 'archive workflow')).toBe(
			'Run executions immediately',
		);
	});

	test('escapes regex metacharacters in the phrase', () => {
		expect(stripActionPrefix('fetch URL https://x', 'fetch URL')).toBe('https://x');
	});
});
