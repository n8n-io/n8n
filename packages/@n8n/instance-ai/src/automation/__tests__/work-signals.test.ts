import type { WorkspaceFilesystem, WorkspaceSandbox } from '@n8n/agents';
import { createWorkspaceTools, wrapUntrustedData } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type { WorkSignal } from '../repeatable-work';
import { assessRepeatableWork } from '../repeatable-work';
import type { WorkToolCall } from '../work-signals';
import {
	collectWorkSignals,
	isWorkToolCall,
	PROPOSE_AUTOMATION_TOOL_NAME,
	readWorkToolCall,
} from '../work-signals';

// The build result reason from the spec, kept apart from the implementation on purpose.
const ONE_OFF_REASON = 'direct-one-off-build-succeeded';

const oneOffBuild = (workflowId = 'wf-1'): WorkToolCall => ({
	toolName: 'build-workflow',
	ok: true,
	workflowId,
	oneOffBuildSucceeded: true,
});
const run = (workflowId = 'wf-1', ok = true): WorkToolCall => ({
	toolName: 'executions',
	action: 'run',
	ok,
	workflowId,
});
const oneOffSignals = (signals: WorkSignal[]) =>
	signals.filter((signal) => signal.kind === 'one-off-success');
const call = (toolName: string, action?: string, ok = true): WorkToolCall => ({
	toolName,
	...(action ? { action } : {}),
	ok,
});
const assess = (userText: string, toolCalls: WorkToolCall[]) =>
	assessRepeatableWork(collectWorkSignals({ userTexts: [userText], toolCalls }));

/**
 * A stored MCP tool call as the agents runtime writes it: the raw result is serialised into
 * untrusted-data text, and `resultIsError` records a result with `isError: true`.
 */
const storedMcpCall = (isError: boolean) => ({
	type: 'tool-call',
	toolCallId: 'call-mcp',
	toolName: 'slack_post_message',
	input: { channel: 'C1', text: 'Daily numbers' },
	state: 'resolved',
	output: {
		type: 'content',
		value: [
			{
				type: 'text',
				text: wrapUntrustedData(
					JSON.stringify({ content: [{ type: 'text', text: 'channel_not_found' }], isError }),
					'mcp:slack',
					'post_message',
				),
			},
		],
	},
	...(isError ? { resultIsError: true } : {}),
});

describe('collectWorkSignals', () => {
	it('returns no signals for an empty chat', () => {
		expect(collectWorkSignals({ userTexts: [], toolCalls: [] })).toEqual([]);
	});

	it('maps each user text and each work call to one signal, in order', () => {
		const signals = collectWorkSignals({
			userTexts: ['first', 'second'],
			toolCalls: [
				{ toolName: 'executions', action: 'run', ok: true, workflowId: 'wf-1' },
				{ toolName: 'nodes', action: 'execute', ok: false },
				{ toolName: 'slack_post_message', ok: true },
				{ toolName: 'github', action: 'create-issue', ok: true },
			],
		});

		expect(signals).toEqual([
			{ kind: 'user-message', text: 'first' },
			{ kind: 'user-message', text: 'second' },
			{ kind: 'tool-call', signature: 'executions:run', ok: true },
			{ kind: 'tool-call', signature: 'nodes:execute', ok: false },
			{ kind: 'tool-call', signature: 'slack_post_message:', ok: true },
			{ kind: 'tool-call', signature: 'github:create-issue', ok: true },
		]);
	});

	it('gives no signal for lookups, builds and set-up calls of the Assistant', () => {
		const signals = collectWorkSignals({
			userTexts: [],
			toolCalls: [
				{ toolName: 'load_skill', ok: true },
				{ toolName: 'nodes', action: 'type-definition', ok: true },
				{ toolName: 'workflows', action: 'list', ok: true },
				{ toolName: 'build-workflow', ok: true, workflowId: 'wf-1' },
				{ toolName: 'research', action: 'web-search', ok: true },
				{ toolName: 'workspace_execute_command', ok: true },
				{ toolName: 'write_todos', ok: true },
				{ toolName: 'read_file', ok: true },
				{ toolName: 'browser_snapshot', ok: true },
			],
		});

		expect(signals).toEqual([]);
	});

	it('keeps user texts exactly as given, including blank ones', () => {
		const signals = collectWorkSignals({ userTexts: ['', '  every day  '], toolCalls: [] });

		expect(signals).toEqual([
			{ kind: 'user-message', text: '' },
			{ kind: 'user-message', text: '  every day  ' },
		]);
	});

	it('gives one one-off-success right after a successful run of a one-off build', () => {
		const signals = collectWorkSignals({ userTexts: [], toolCalls: [oneOffBuild(), run()] });

		expect(signals).toEqual([
			{ kind: 'tool-call', signature: 'executions:run', ok: true },
			{ kind: 'one-off-success', workflowId: 'wf-1' },
		]);
	});

	it('gives no one-off-success when the run comes before the build', () => {
		const signals = collectWorkSignals({ userTexts: [], toolCalls: [run(), oneOffBuild()] });

		expect(oneOffSignals(signals)).toEqual([]);
	});

	it('gives no one-off-success when the run is of another workflow', () => {
		const signals = collectWorkSignals({
			userTexts: [],
			toolCalls: [oneOffBuild('wf-1'), run('wf-2')],
		});

		expect(oneOffSignals(signals)).toEqual([]);
	});

	it('gives no one-off-success when the run failed', () => {
		const signals = collectWorkSignals({
			userTexts: [],
			toolCalls: [oneOffBuild(), run('wf-1', false)],
		});

		expect(oneOffSignals(signals)).toEqual([]);
	});

	it('gives no one-off-success when the build was not a one-off build', () => {
		const signals = collectWorkSignals({
			userTexts: [],
			toolCalls: [{ toolName: 'build-workflow', ok: true, workflowId: 'wf-1' }, run()],
		});

		expect(oneOffSignals(signals)).toEqual([]);
	});

	it('gives no one-off-success when the build has no workflow ID', () => {
		const withoutId = collectWorkSignals({
			userTexts: [],
			toolCalls: [
				{ toolName: 'build-workflow', ok: true, oneOffBuildSucceeded: true },
				{ toolName: 'executions', action: 'run', ok: true },
			],
		});
		const blankIds = collectWorkSignals({ userTexts: [], toolCalls: [oneOffBuild(''), run('')] });

		expect(oneOffSignals(withoutId)).toEqual([]);
		expect(oneOffSignals(blankIds)).toEqual([]);
	});

	it('reads the one-off marker only on build-workflow calls', () => {
		const signals = collectWorkSignals({
			userTexts: [],
			toolCalls: [
				{ toolName: 'workflows', ok: true, workflowId: 'wf-1', oneOffBuildSucceeded: true },
				run(),
			],
		});

		expect(oneOffSignals(signals)).toEqual([]);
	});

	it('counts only an executions call with the run action as the run', () => {
		const signals = collectWorkSignals({
			userTexts: [],
			toolCalls: [
				oneOffBuild(),
				{ toolName: 'executions', action: 'get', ok: true, workflowId: 'wf-1' },
				{ toolName: 'workflows', action: 'run', ok: true, workflowId: 'wf-1' },
			],
		});

		expect(oneOffSignals(signals)).toEqual([]);
	});

	it('gives at most one one-off-success in a chat', () => {
		const signals = collectWorkSignals({
			userTexts: [],
			toolCalls: [oneOffBuild('wf-1'), run('wf-1'), oneOffBuild('wf-2'), run('wf-2'), run('wf-1')],
		});

		expect(oneOffSignals(signals)).toEqual([{ kind: 'one-off-success', workflowId: 'wf-1' }]);
	});

	it('ignores the propose_automation calls of the Assistant', () => {
		const signals = collectWorkSignals({
			userTexts: ['hi'],
			toolCalls: [
				{ toolName: PROPOSE_AUTOMATION_TOOL_NAME, ok: true, workflowId: 'wf-1' },
				{ toolName: PROPOSE_AUTOMATION_TOOL_NAME, ok: true, workflowId: 'wf-1' },
			],
		});

		expect(signals).toEqual([{ kind: 'user-message', text: 'hi' }]);
	});

	it('scores a chat with a one-off run and a repeated call as repeatable', () => {
		const assessment = assess('Copy these rows to the sheet', [
			run('wf-0'),
			run('wf-0'),
			oneOffBuild(),
			run(),
		]);

		expect(assessment.reasons).toEqual(['repeated-tool-call', 'one-off-success']);
		expect(assessment.score).toBe(0.6);
	});

	it('scores a one-off build chat with repeated lookups below the threshold', () => {
		const assessment = assess('Copy these rows to the sheet', [
			call('load_skill'),
			call('load_skill'),
			call('nodes', 'type-definition'),
			call('nodes', 'type-definition'),
			call('workflows', 'get-as-code'),
			call('workflows', 'get-as-code'),
			{ toolName: 'build-workflow', ok: true, workflowId: 'wf-1' },
			oneOffBuild(),
			run(),
		]);

		expect(assessment.reasons).toEqual(['one-off-success']);
		expect(assessment.score).toBe(0.2);
	});

	it('scores the workspace steps of the workflow builder in a one-off chat below the threshold', () => {
		// The builder writes the code, validates it, edits it and validates it again.
		const assessment = assess('Copy these rows to the sheet', [
			call('load_skill'),
			call('workspace_write_file'),
			call('workspace_execute_command'),
			call('workspace_str_replace_file'),
			call('workspace_execute_command'),
			call('workspace_read_file'),
			call('workspace_read_file'),
			oneOffBuild(),
			run(),
		]);

		expect(assessment.repeatedSignatures).toEqual([]);
		expect(assessment.reasons).toEqual(['one-off-success']);
	});

	it('scores repeated reads of local files and pages in a one-off chat below the threshold', () => {
		const assessment = assess('Copy these rows to the sheet', [
			call('read_file'),
			call('read_file'),
			call('browser_navigate'),
			call('browser_snapshot'),
			call('browser_navigate'),
			call('browser_snapshot'),
			oneOffBuild(),
			run(),
		]);

		expect(assessment.repeatedSignatures).toEqual([]);
		expect(assessment.score).toBe(0.2);
	});

	it('does not count a failed node run and its successful retry as a repeat', () => {
		const assessment = assess('Please automate posting this to Slack', [
			call('nodes', 'execute', false),
			call('nodes', 'execute', true),
		]);

		expect(assessment.reasons).toEqual(['intent-phrase']);
		expect(assessment.score).toBe(0.3);
	});

	it('does not count two failed MCP calls as a repeat in a one-off chat', () => {
		const failedCall = readWorkToolCall(storedMcpCall(true));
		if (!failedCall) throw new Error('Expected a tool call');

		const assessment = assess('Copy these rows to the sheet', [
			failedCall,
			failedCall,
			oneOffBuild(),
			run(),
		]);

		expect(assessment.repeatedSignatures).toEqual([]);
		expect(assessment.reasons).toEqual(['one-off-success']);
		expect(assessment.score).toBe(0.2);
	});

	it('counts two successful MCP calls as a repeat', () => {
		const okCall = readWorkToolCall(storedMcpCall(false));
		if (!okCall) throw new Error('Expected a tool call');

		const assessment = assess('Copy these rows to the sheet', [
			okCall,
			okCall,
			oneOffBuild(),
			run(),
		]);

		expect(assessment.repeatedSignatures).toEqual(['slack_post_message:']);
		expect(assessment.score).toBe(0.6);
	});
});

describe('isWorkToolCall', () => {
	it.each([
		['executions', 'run'],
		['nodes', 'execute'],
		['data-tables', 'insert-rows'],
		['data-tables', 'update-rows'],
		['data-tables', 'delete-rows'],
		['slack_post_message', undefined],
		['gmail_send', 'send'],
		['write_file', undefined],
		['shell_execute', undefined],
		['browser_click', undefined],
		['browser_type', undefined],
		['browser_cookies', 'set'],
		['browser_cookies', 'clear'],
		['browser_storage', 'set'],
		['browser_storage', 'clear'],
		['keyboard_type', undefined],
		['mouse_click', undefined],
	])('counts %s:%s as work', (toolName, action) => {
		expect(isWorkToolCall({ toolName, ...(action ? { action } : {}) })).toBe(true);
	});

	it.each([
		['load_skill', undefined],
		['search_tools', undefined],
		['load_tool', undefined],
		['ask-user', undefined],
		['research', 'web-search'],
		['web-search', undefined],
		['fetch-url', undefined],
		['n8n-docs', 'search'],
		['conversation-history', 'search'],
		['build-workflow', undefined],
		['workflows', 'list'],
		['workflows', 'get-as-code'],
		['workflows', 'publish'],
		['workflows', 'run'],
		['executions', undefined],
		['executions', 'list'],
		['executions', 'get'],
		['executions', 'debug'],
		['executions', 'run-step'],
		['executions', 'get-node-output'],
		['nodes', undefined],
		['nodes', 'search'],
		['nodes', 'type-definition'],
		['nodes', 'explore-resources'],
		['data-tables', 'query'],
		['data-tables', 'create'],
		['credentials', 'setup'],
		['create-tasks', undefined],
		['verify-built-workflow', undefined],
		[PROPOSE_AUTOMATION_TOOL_NAME, undefined],
		['write_todos', undefined],
		['recall_memory', undefined],
		['flag_memory', undefined],
		['delegate_subagent', undefined],
		['workspace_execute_command', undefined],
		['workspace_write_file', undefined],
		['workspace_str_replace_file', undefined],
		['workspace_read_file', undefined],
		['workspace_read_tool_result', undefined],
		['read_file', undefined],
		['list_files', undefined],
		['get_file_tree', undefined],
		['search_files', undefined],
		['screen_screenshot', undefined],
		['browser_navigate', undefined],
		['browser_snapshot', undefined],
		['browser_content', undefined],
		['browser_wait', undefined],
		['browser_tab_open', undefined],
		['browser_tab_close', undefined],
		['browser_cookies', 'get'],
		['browser_storage', 'get'],
	])('does not count %s:%s as work', (toolName, action) => {
		expect(isWorkToolCall({ toolName, ...(action ? { action } : {}) })).toBe(false);
	});

	it('does not count any workspace tool that the agents runtime adds', () => {
		const tools = createWorkspaceTools({
			filesystem: mock<WorkspaceFilesystem>(),
			sandbox: mock<WorkspaceSandbox>(),
		});

		expect(tools.length).toBeGreaterThan(10);
		expect(tools.filter((tool) => isWorkToolCall({ toolName: tool.name }))).toEqual([]);
	});
});

describe('readWorkToolCall', () => {
	const part = (overrides: Record<string, unknown> = {}) => ({
		type: 'tool-call',
		toolCallId: 'call-1',
		toolName: 'workflows',
		input: { action: 'list' },
		state: 'resolved',
		output: { workflows: [] },
		...overrides,
	});

	it('reads the tool name and the action of a finished call', () => {
		expect(readWorkToolCall(part())).toStrictEqual({
			toolName: 'workflows',
			action: 'list',
			ok: true,
		});
	});

	it.each([
		['a text part', { type: 'text', text: 'hello' }],
		['a missing tool name', part({ toolName: undefined })],
		['a blank tool name', part({ toolName: '   ' })],
		['an unknown state', part({ state: 'streaming' })],
		['a string', 'tool-call'],
		['null', null],
	])('returns undefined for %s', (_label, value) => {
		expect(readWorkToolCall(value)).toBeUndefined();
	});

	it.each([
		['pending', part({ state: 'pending', output: undefined })],
		['rejected', part({ state: 'rejected', output: undefined, error: 'Tool failed' })],
		['canceled', part({ canceled: true })],
		['success: false', part({ output: { success: false } })],
		['ok: false', part({ output: { ok: false } })],
		['denied: true', part({ output: { denied: true, message: 'Not now' } })],
		['an unwrapped result with isError: true', part({ output: { isError: true } })],
		['resultIsError: true', part({ resultIsError: true })],
	])('marks a %s call as not ok', (_label, value) => {
		expect(readWorkToolCall(value)?.ok).toBe(false);
	});

	it('marks a stored MCP call whose result reported a failure as not ok', () => {
		expect(readWorkToolCall(storedMcpCall(true))).toStrictEqual({
			toolName: 'slack_post_message',
			ok: false,
		});
	});

	it('marks a stored MCP call whose result succeeded as ok', () => {
		expect(readWorkToolCall(storedMcpCall(false))).toStrictEqual({
			toolName: 'slack_post_message',
			ok: true,
		});
	});

	it('reads the failure marker of the runtime on any tool, also a run that succeeded', () => {
		const runPart = part({
			toolName: 'executions',
			input: { action: 'run', workflowId: 'wf-1' },
			output: { status: 'success' },
			resultIsError: true,
		});

		expect(readWorkToolCall(runPart)?.ok).toBe(false);
	});

	it.each([
		['success: true', { success: true }],
		['ok: true', { ok: true }],
		['denied: false', { denied: false }],
		['a text result', 'Done'],
		['no result fields', {}],
	])('marks a finished call with %s as ok', (_label, output) => {
		expect(readWorkToolCall(part({ output }))?.ok).toBe(true);
	});

	it('marks a finished call that was not canceled as ok', () => {
		expect(readWorkToolCall(part({ canceled: false }))?.ok).toBe(true);
	});

	it.each([
		['false', false],
		['a value that is not a boolean', 'yes'],
	])('marks a finished call with resultIsError %s as ok', (_label, resultIsError) => {
		expect(readWorkToolCall(part({ resultIsError }))?.ok).toBe(true);
	});

	it.each([
		['success', true],
		['error', false],
		['running', false],
		['waiting', false],
		[undefined, false],
	])('marks a workflow run with status %s as ok: %s', (status, ok) => {
		const runPart = part({
			toolName: 'executions',
			input: { action: 'run', workflowId: 'wf-1' },
			output: { executionId: 'exec-1', status },
		});

		expect(readWorkToolCall(runPart)).toStrictEqual({
			toolName: 'executions',
			action: 'run',
			ok,
			workflowId: 'wf-1',
		});
	});

	it.each<[string, boolean, unknown]>([
		['a successful run', true, { status: 'success', output: '[]' }],
		['a failed run', false, { status: 'error', error: { message: 'Credentials are not valid' } }],
		['a denied run', false, { status: 'error', denied: true, reason: 'User denied the action' }],
		['a result without a status', false, { output: '[]' }],
	])('marks a node execution with %s as ok: %s', (_label, ok, output) => {
		const executePart = part({
			toolName: 'nodes',
			input: { action: 'execute', type: 'n8n-nodes-base.slack', version: 2 },
			output,
		});

		expect(readWorkToolCall(executePart)).toStrictEqual({
			toolName: 'nodes',
			action: 'execute',
			ok,
		});
	});

	it('uses the status rule only for workflow runs and node executions', () => {
		const lookup = part({
			toolName: 'executions',
			input: { action: 'get', executionId: 'exec-1' },
			output: { status: 'error' },
		});
		const nodeLookup = part({
			toolName: 'nodes',
			input: { action: 'type-definition' },
			output: { status: 'error' },
		});
		const otherTool = part({ input: { action: 'run' }, output: { status: 'running' } });
		const otherExecute = part({ input: { action: 'execute' }, output: { status: 'error' } });

		expect(readWorkToolCall(lookup)?.ok).toBe(true);
		expect(readWorkToolCall(nodeLookup)?.ok).toBe(true);
		expect(readWorkToolCall(otherTool)?.ok).toBe(true);
		expect(readWorkToolCall(otherExecute)?.ok).toBe(true);
	});

	it('reads a one-off build with the workflow ID from its result', () => {
		const build = part({
			toolName: 'build-workflow',
			input: { code: 'workflow()' },
			output: {
				success: true,
				workflowId: 'wf-new',
				postBuildFlow: { reason: ONE_OFF_REASON, skillId: 'one-off-operations' },
			},
		});

		expect(readWorkToolCall(build)).toStrictEqual({
			toolName: 'build-workflow',
			ok: true,
			workflowId: 'wf-new',
			oneOffBuildSucceeded: true,
		});
	});

	it('takes the workflow ID of a build from its result, not from its input', () => {
		const build = part({
			toolName: 'build-workflow',
			input: { workflowId: 'wf-input' },
			output: { success: true },
		});

		expect(readWorkToolCall(build)).toStrictEqual({ toolName: 'build-workflow', ok: true });
	});

	it('does not mark a build with another post-build reason as one-off', () => {
		const build = part({
			toolName: 'build-workflow',
			input: {},
			output: {
				success: true,
				workflowId: 'wf-1',
				postBuildFlow: { reason: 'direct-build-succeeded' },
			},
		});

		expect(readWorkToolCall(build)).toStrictEqual({
			toolName: 'build-workflow',
			ok: true,
			workflowId: 'wf-1',
		});
	});

	it('does not read the one-off marker from a tool other than build-workflow', () => {
		const other = part({
			input: {},
			output: { workflowId: 'wf-1', postBuildFlow: { reason: ONE_OFF_REASON } },
		});

		expect(readWorkToolCall(other)).toStrictEqual({ toolName: 'workflows', ok: true });
	});

	it('reads fields with an unexpected type as absent, and keeps the call', () => {
		const odd = part({
			input: { action: 42, workflowId: ['wf-1'] },
			output: { success: 'no', status: 7, postBuildFlow: 'one-off' },
			canceled: 'yes',
		});

		expect(readWorkToolCall(odd)).toStrictEqual({ toolName: 'workflows', ok: true });
	});

	it('reads blank action and workflow ID values as absent', () => {
		const blank = part({ input: { action: ' ', workflowId: '' } });

		expect(readWorkToolCall(blank)).toStrictEqual({ toolName: 'workflows', ok: true });
	});

	it('reads an input that is not an object as empty', () => {
		expect(readWorkToolCall(part({ input: 'list' }))).toStrictEqual({
			toolName: 'workflows',
			ok: true,
		});
	});

	it('trims the tool name', () => {
		expect(readWorkToolCall(part({ toolName: ' workflows ' }))?.toolName).toBe('workflows');
	});
});
