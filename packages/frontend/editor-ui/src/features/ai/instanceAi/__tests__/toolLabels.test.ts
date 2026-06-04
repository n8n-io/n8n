import { describe, test, expect, vi } from 'vitest';
import { getToolIcon, useToolLabel } from '../toolLabels';
import type { InstanceAiToolCallState } from '@n8n/api-types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => {
			const translations: Record<string, string> = {
				'instanceAi.tools.nodes': 'Search nodes',
				'instanceAi.tools.executions': 'Run workflow',
				'instanceAi.tools.workspace_execute_command': 'Running command',
				'instanceAi.tools.workspace_execute_command.skill': 'Running skill script',
				'instanceAi.tools.workspace_execute_command.skillScript': 'Running',
				'instanceAi.tools.list_skills': 'Checking available skills',
				'instanceAi.tools.load_skill': 'Opening skill',
				'instanceAi.tools.load_skill.asset': 'Opening',
				'instanceAi.tools.load_skill.assetFallback': 'asset',
				'instanceAi.tools.load_skill.example': 'Reading',
				'instanceAi.tools.load_skill.exampleFallback': 'example',
				'instanceAi.tools.load_skill.file': 'Reading',
				'instanceAi.tools.load_skill.reference': 'Reading',
				'instanceAi.tools.load_skill.referenceFallback': 'reference',
				'instanceAi.tools.load_skill.script': 'Inspecting',
				'instanceAi.tools.load_skill.scriptFallback': 'script',
				'instanceAi.tools.load_skill.template': 'Reading',
				'instanceAi.tools.load_skill.templateFallback': 'template',
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
		expect(getToolIcon('build-workflow-with-agent')).toBe('share');
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
	});

	test('returns file-text for filesystem tools', () => {
		expect(getToolIcon('filesystem')).toBe('file-text');
	});

	test('returns folder for workspace tools', () => {
		expect(getToolIcon('workspace')).toBe('folder');
		expect(getToolIcon('workspace_execute_command')).toBe('folder');
		expect(getToolIcon('workspace_read_file')).toBe('folder');
	});

	test('returns book-open for skill tools', () => {
		expect(getToolIcon('list_skills')).toBe('book-open');
		expect(getToolIcon('load_skill')).toBe('book-open');
	});

	test('returns settings as default', () => {
		expect(getToolIcon('unknown-tool')).toBe('settings');
	});
});

describe('useToolLabel', () => {
	test('getToolLabel returns translated label when found', () => {
		const { getToolLabel } = useToolLabel();
		expect(getToolLabel('nodes')).toBe('Search nodes');
		expect(getToolLabel('workspace_execute_command')).toBe('Running command');
		expect(getToolLabel('list_skills')).toBe('Checking available skills');
		expect(getToolLabel('load_skill', { name: 'data-table-manager' })).toBe(
			'Opening skill: data-table-manager',
		);
		expect(
			getToolLabel('load_skill', {
				name: 'data-table-manager',
				filePath: 'references/data-table-playbook.md',
			}),
		).toBe('Reading data table playbook');
		expect(
			getToolLabel('load_skill', {
				name: 'data-table-manager',
				filePath: 'scripts/import-rows.mjs',
			}),
		).toBe('Inspecting import rows script');
	});

	test('getToolLabel shows skill script commands cleanly', () => {
		const { getToolLabel } = useToolLabel();
		expect(
			getToolLabel('workspace_execute_command', {
				command: 'node /home/daytona/workspace/skills/data-table-manager/scripts/import-rows.mjs',
			}),
		).toBe('Running import rows script');
		expect(
			getToolLabel('workspace_execute_command', {
				command: 'node $N8N_SKILL_DIR/scripts/import-rows.mjs',
			}),
		).toBe('Running import rows script');
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
