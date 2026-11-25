import { DOMAIN_TOOL_IDS } from '../../tools/tool-ids';
import { deriveAssistantUsageTier, listAssistantToolsUsed } from '../assistant-usage';
import type { ToolCallSummary } from '../work-summary-accumulator';

function returnedCall(toolName: string, extra: Partial<ToolCallSummary> = {}): ToolCallSummary {
	return { toolCallId: 'tc-1', toolName, succeeded: true, returned: true, ...extra };
}

describe('deriveAssistantUsageTier', () => {
	it('returns none for a turn without tool calls', () => {
		expect(deriveAssistantUsageTier([])).toBe('none');
	});

	it('returns strict for a turn that ran a workflow', () => {
		expect(deriveAssistantUsageTier([returnedCall(DOMAIN_TOOL_IDS.RUN_WORKFLOW)])).toBe('strict');
	});

	it('returns none for a turn that only asked a question and looked up nodes', () => {
		const calls = [
			returnedCall(DOMAIN_TOOL_IDS.ASK_USER),
			returnedCall(DOMAIN_TOOL_IDS.SEARCH_NODES),
			returnedCall(DOMAIN_TOOL_IDS.GET_NODE_TYPES),
		];

		expect(deriveAssistantUsageTier(calls)).toBe('none');
	});

	it.each([
		DOMAIN_TOOL_IDS.GET_WORKFLOW,
		DOMAIN_TOOL_IDS.DEBUG_EXECUTION,
		DOMAIN_TOOL_IDS.N8N_DOCS,
		DOMAIN_TOOL_IDS.ACTIVITY,
		'open_app',
	])('returns broad for a turn that only called %s', (toolName) => {
		const calls = [returnedCall(DOMAIN_TOOL_IDS.ASK_USER), returnedCall(toolName)];

		expect(deriveAssistantUsageTier(calls)).toBe('broad');
	});

	it('returns the highest tier of the calls', () => {
		const calls = [
			returnedCall(DOMAIN_TOOL_IDS.GET_WORKFLOW),
			returnedCall(DOMAIN_TOOL_IDS.RUN_WORKFLOW),
			returnedCall(DOMAIN_TOOL_IDS.SEARCH_NODES),
		];

		expect(deriveAssistantUsageTier(calls)).toBe('strict');
	});

	it('skips a call that is still waiting for a result', () => {
		const call = returnedCall(DOMAIN_TOOL_IDS.RUN_WORKFLOW);
		delete call.returned;

		expect(deriveAssistantUsageTier([call])).toBe('none');
	});

	it('skips a call that the user denied', () => {
		const calls = [
			returnedCall(DOMAIN_TOOL_IDS.GET_WORKFLOW),
			returnedCall(DOMAIN_TOOL_IDS.RUN_WORKFLOW, { denied: true }),
		];

		expect(deriveAssistantUsageTier(calls)).toBe('broad');
	});

	it.each([
		[DOMAIN_TOOL_IDS.SKILLS, 'list'],
		[DOMAIN_TOOL_IDS.SKILLS, 'get'],
		[DOMAIN_TOOL_IDS.SKILLS, 'list-sources'],
		[DOMAIN_TOOL_IDS.SKILLS, 'discover-source'],
		[DOMAIN_TOOL_IDS.EVAL_CONFIG, 'get'],
		[DOMAIN_TOOL_IDS.EVAL_CONFIG, 'describe'],
	])('returns broad for the read-only action %s %s', (toolName, action) => {
		expect(deriveAssistantUsageTier([returnedCall(toolName, { action })])).toBe('broad');
	});

	it.each([
		[DOMAIN_TOOL_IDS.SKILLS, 'create'],
		[DOMAIN_TOOL_IDS.EVAL_CONFIG, 'delete'],
		[DOMAIN_TOOL_IDS.SKILLS, 'unknown-action'],
		[DOMAIN_TOOL_IDS.SKILLS, undefined],
	])('returns strict for the action %s %s', (toolName, action) => {
		expect(deriveAssistantUsageTier([returnedCall(toolName, { action })])).toBe('strict');
	});

	it('returns none for the agent sandbox tools', () => {
		expect(deriveAssistantUsageTier([returnedCall('workspace_execute_command')])).toBe('none');
	});

	it('returns strict for a tool it does not know, such as a tool from an MCP server', () => {
		expect(deriveAssistantUsageTier([returnedCall('github_create_issue')])).toBe('strict');
	});
});

describe('listAssistantToolsUsed', () => {
	it('lists each counted tool once, sorted, without pending or denied calls', () => {
		const pending = returnedCall(DOMAIN_TOOL_IDS.DELETE_CREDENTIAL);
		delete pending.returned;
		const calls = [
			returnedCall(DOMAIN_TOOL_IDS.RUN_WORKFLOW),
			returnedCall(DOMAIN_TOOL_IDS.GET_WORKFLOW),
			returnedCall(DOMAIN_TOOL_IDS.RUN_WORKFLOW),
			returnedCall(DOMAIN_TOOL_IDS.PUBLISH_WORKFLOW, { denied: true }),
			pending,
		];

		expect(listAssistantToolsUsed(calls)).toEqual(['get_workflow', 'run_workflow']);
	});

	it.each([
		[DOMAIN_TOOL_IDS.SKILLS, 'list', 'skills:list'],
		[DOMAIN_TOOL_IDS.EVAL_CONFIG, 'delete', 'eval-config:delete'],
		[DOMAIN_TOOL_IDS.SKILLS, 'unknown-action', 'skills'],
		[DOMAIN_TOOL_IDS.RUN_WORKFLOW, 'list', 'run_workflow'],
		['workspace_execute_command', undefined, 'workspace'],
		['github_create_issue', undefined, 'other'],
	])('labels %s with action %s as %s', (toolName, action, label) => {
		expect(listAssistantToolsUsed([returnedCall(toolName, { action })])).toEqual([label]);
	});
});
