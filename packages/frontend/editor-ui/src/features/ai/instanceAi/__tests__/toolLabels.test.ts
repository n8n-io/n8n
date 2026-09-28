import { describe, test, expect, vi } from 'vitest';
import { getToolIcon, useToolLabel } from '../toolLabels';
import type { InstanceAiToolCallState } from '@n8n/api-types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => {
			const translations: Record<string, string> = {
				'instanceAi.tools.read_config': 'Reading agent config',
				'instanceAi.tools.resolve_integration': 'Adding integration',
				'instanceAi.tools.agent_build': 'Working with agent',
				'instanceAi.tools.agent_build.exploring': 'Exploring agent',
				'instanceAi.tools.agent_context': 'Exploring agent context',
				'instanceAi.tools.agent_context.config': 'Reading agent config',
				'instanceAi.tools.agent_context.sessions': 'Checking agent sessions',
				'instanceAi.tools.node_types_get': 'Reading node schema',
				'instanceAi.tools.credentials_list': 'Inspecting credentials',
				'instanceAi.tools.list_workflows': 'Listing workflows',
				'instanceAi.tools.nodes': 'Search nodes',
				'instanceAi.tools.executions': 'Run workflow',
				'instanceAi.tools.activity': 'Activity',
				'instanceAi.tools.activity.list': 'Checking recent activity',
				'instanceAi.tools.conversation_history': 'Past conversations',
				'instanceAi.tools.conversation_history.search': 'Searching past conversations',
				'instanceAi.tools.workspace_execute_command': 'Running command',
				'instanceAi.tools.workspace_execute_command.skill': 'Running skill script',
				'instanceAi.tools.workspace_execute_command.skillScript': 'Running',
				'instanceAi.tools.n8n_docs': 'Reading n8n docs',
				'instanceAi.tools.n8n_docs.lookup': 'Reading n8n docs',
				'instanceAi.tools.n8n_docs.search': 'Searching n8n docs',
				'instanceAi.tools.n8n_docs.read': 'Opening n8n docs',
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
	test('returns circle-check for checkpoint_complete', () => {
		expect(getToolIcon('checkpoint_complete')).toBe('circle-check');
	});

	test('returns default icon for removed delegate tool', () => {
		expect(getToolIcon('delegate')).toBe('wrench');
	});

	test('returns share for tools ending with -with-agent', () => {
		expect(getToolIcon('build-workflow-with-agent')).toBe('share');
	});

	test('returns share for resolve_integration', () => {
		expect(getToolIcon('resolve_integration')).toBe('share');
	});

	test('returns table for data-table tools', () => {
		expect(getToolIcon('data_tables')).toBe('table');
	});

	test('returns workflow for workflow-related tools', () => {
		expect(getToolIcon('workflows')).toBe('workflow');
		expect(getToolIcon('executions')).toBe('workflow');
		expect(getToolIcon('nodes')).toBe('workflow');
		expect(getToolIcon('templates')).toBe('workflow');
		expect(getToolIcon('nodes_search')).toBe('workflow');
		expect(getToolIcon('node_types_get')).toBe('workflow');
		expect(getToolIcon('submit-workflow')).toBe('workflow');
		expect(getToolIcon('node_type_materialize')).toBe('workflow');
	});

	test('returns search for research tools', () => {
		expect(getToolIcon('research')).toBe('search');
	});

	test('returns brain for memory/task-control tools', () => {
		expect(getToolIcon('updateWorkingMemory')).toBe('brain');
		expect(getToolIcon('task_control')).toBe('brain');
	});

	test('treats removed plan tool as an ordinary unknown icon', () => {
		expect(getToolIcon('plan')).toBe('wrench');
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
		expect(getToolIcon('skills_create')).toBe('book-open');
		expect(getToolIcon('list_skills')).toBe('book-open');
		expect(getToolIcon('read_skill')).toBe('book-open');
		expect(getToolIcon('skill_update')).toBe('book-open');
		expect(getToolIcon('load_skill')).toBe('book-open');
	});

	test('returns book-open for n8n docs tool', () => {
		expect(getToolIcon('n8n_docs')).toBe('book-open');
	});

	test('returns history for the activity tool', () => {
		expect(getToolIcon('activity')).toBe('history');
	});

	test('returns message-square for the conversation_history tool', () => {
		expect(getToolIcon('conversation_history')).toBe('message-square');
	});

	test('returns wrench as default', () => {
		expect(getToolIcon('unknown-tool')).toBe('wrench');
	});
});

describe('useToolLabel', () => {
	test('getToolLabel returns translated label when found', () => {
		const { getToolLabel } = useToolLabel();
		expect(getToolLabel('read_config')).toBe('Reading agent config');
		expect(getToolLabel('resolve_integration')).toBe('Adding integration');
		expect(getToolLabel('agent_build')).toBe('Working with agent');
		expect(getToolLabel('agent_build', { operation: 'exploring' })).toBe('Exploring agent');
		expect(getToolLabel('agent_build', { operation: 'creating' })).toBe('Working with agent');
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

	test('getToolLabel humanizes builder tools via i18n keys for the stable tool IDs', () => {
		const { getToolLabel } = useToolLabel();
		expect(getToolLabel('resolve_integration')).toBe('Adding integration');
		expect(getToolLabel('node_types_get')).toBe('Reading node schema');
		expect(getToolLabel('credentials_list')).toBe('Inspecting credentials');
		expect(getToolLabel('list_workflows')).toBe('Listing workflows');
	});

	test('getToolLabel uses the agent_context lookup label when available', () => {
		const { getToolLabel } = useToolLabel();
		expect(getToolLabel('agent_context', { type: 'config' })).toBe('Reading agent config');
		expect(getToolLabel('agent_context', { type: 'sessions' })).toBe('Checking agent sessions');
		expect(getToolLabel('agent_context', { type: 'unknown' })).toBe('Exploring agent context');
		expect(getToolLabel('agent_context')).toBe('Exploring agent context');
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

	test('getToolLabel returns action-specific n8n docs labels', () => {
		const { getToolLabel } = useToolLabel();
		expect(getToolLabel('n8n_docs')).toBe('Reading n8n docs');
		expect(getToolLabel('n8n_docs', { action: 'lookup' })).toBe('Reading n8n docs');
		expect(getToolLabel('n8n_docs', { action: 'search' })).toBe('Searching n8n docs');
		expect(getToolLabel('n8n_docs', { action: 'read' })).toBe('Opening n8n docs');
	});

	test('getToolLabel returns action-specific activity and conversation_history labels', () => {
		const { getToolLabel } = useToolLabel();
		expect(getToolLabel('activity')).toBe('Activity');
		expect(getToolLabel('activity', { action: 'list' })).toBe('Checking recent activity');
		expect(getToolLabel('conversation_history')).toBe('Past conversations');
		expect(getToolLabel('conversation_history', { action: 'search' })).toBe(
			'Searching past conversations',
		);
	});

	test('getToggleLabel returns show data for regular tools', () => {
		const { getToggleLabel } = useToolLabel();
		expect(getToggleLabel(makeToolCall({ toolName: 'workflows' }))).toBe('Show data');
	});

	test('getToggleLabel returns show data for removed delegate tool', () => {
		const { getToggleLabel } = useToolLabel();
		expect(getToggleLabel(makeToolCall({ toolName: 'delegate' }))).toBe('Show data');
	});

	test('getToggleLabel returns undefined for no-toggle tools', () => {
		const { getToggleLabel } = useToolLabel();
		expect(getToggleLabel(makeToolCall({ toolName: 'updateWorkingMemory' }))).toBeUndefined();
		expect(getToggleLabel(makeToolCall({ toolName: 'task_control' }))).toBeUndefined();
	});

	test('getToggleLabel treats removed plan tool as an ordinary unknown tool', () => {
		const { getToggleLabel } = useToolLabel();
		expect(getToggleLabel(makeToolCall({ toolName: 'plan' }))).toBe('Show data');
	});

	test('getHideLabel returns hide data for regular tools', () => {
		const { getHideLabel } = useToolLabel();
		expect(getHideLabel(makeToolCall({ toolName: 'workflows' }))).toBe('Hide data');
	});

	test('getHideLabel returns hide data for removed delegate tool', () => {
		const { getHideLabel } = useToolLabel();
		expect(getHideLabel(makeToolCall({ toolName: 'delegate' }))).toBe('Hide data');
	});

	test('getHideLabel returns undefined for no-toggle tools', () => {
		const { getHideLabel } = useToolLabel();
		expect(getHideLabel(makeToolCall({ toolName: 'task_control' }))).toBeUndefined();
	});

	test('getHideLabel treats removed plan tool as an ordinary unknown tool', () => {
		const { getHideLabel } = useToolLabel();
		expect(getHideLabel(makeToolCall({ toolName: 'plan' }))).toBe('Hide data');
	});
});
