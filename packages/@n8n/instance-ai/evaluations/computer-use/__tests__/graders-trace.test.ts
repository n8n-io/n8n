import type { CapturedToolCall } from '../../types';
import {
	gradeBudget,
	gradeFinalTextMatches,
	gradeMustCallMcpServer,
	gradeMustCallTool,
	gradeMustNotCallMcpServer,
	gradeMustNotCallTool,
	gradeMustNotLoop,
	gradeMustReachUrl,
	gradeToolsMustNotError,
} from '../graders/trace';
import { computeTokenStats } from '../tokens';
import type { ScenarioTrace } from '../types';

function trace(toolCalls: Array<Partial<CapturedToolCall>>): ScenarioTrace {
	const calls: CapturedToolCall[] = toolCalls.map((tc, i) => ({
		toolCallId: tc.toolCallId ?? `call-${String(i)}`,
		toolName: tc.toolName ?? 'unknown',
		args: tc.args ?? {},
		result: tc.result,
		error: tc.error,
		durationMs: tc.durationMs ?? 0,
	}));
	return {
		events: [],
		toolCalls: calls,
		confirmations: [],
		finalText: '',
		durationMs: 0,
		tokens: computeTokenStats(calls),
		threadId: 'test-thread',
	};
}

describe('trace.mustCallMcpServer', () => {
	it('passes when the agent invokes a computer-use tool', () => {
		const result = gradeMustCallMcpServer(
			trace([{ toolName: 'write_file' }, { toolName: 'create_workflow_from_code' }]),
			{ type: 'trace.mustCallMcpServer', server: 'computer-use' },
		);
		expect(result.pass).toBe(true);
	});

	it('passes for any browser_* tool', () => {
		const result = gradeMustCallMcpServer(trace([{ toolName: 'browser_navigate' }]), {
			type: 'trace.mustCallMcpServer',
			server: 'computer-use',
		});
		expect(result.pass).toBe(true);
	});

	it('fails when only native instance-ai tools were called', () => {
		const result = gradeMustCallMcpServer(
			trace([{ toolName: 'create_workflow_from_code' }, { toolName: 'search_nodes' }]),
			{ type: 'trace.mustCallMcpServer', server: 'computer-use' },
		);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain('never invoked');
	});
});

describe('trace.mustNotCallMcpServer', () => {
	it('passes when only native tools were called', () => {
		const result = gradeMustNotCallMcpServer(trace([{ toolName: 'create_workflow_from_code' }]), {
			type: 'trace.mustNotCallMcpServer',
			server: 'computer-use',
		});
		expect(result.pass).toBe(true);
	});

	it('fails when the agent over-suggested computer-use', () => {
		const result = gradeMustNotCallMcpServer(trace([{ toolName: 'browser_navigate' }]), {
			type: 'trace.mustNotCallMcpServer',
			server: 'computer-use',
		});
		expect(result.pass).toBe(false);
	});
});

describe('trace.mustCallTool / mustNotCallTool', () => {
	it('mustCallTool matches by substring', () => {
		const result = gradeMustCallTool(trace([{ toolName: 'browser_navigate' }]), {
			type: 'trace.mustCallTool',
			name: 'navigate',
		});
		expect(result.pass).toBe(true);
	});

	it('mustNotCallTool flags forbidden tools', () => {
		const result = gradeMustNotCallTool(trace([{ toolName: 'shell_execute' }]), {
			type: 'trace.mustNotCallTool',
			name: 'shell_execute',
		});
		expect(result.pass).toBe(false);
	});
});

describe('trace.mustNotLoop', () => {
	it('passes when no run exceeds the limit', () => {
		const result = gradeMustNotLoop(
			trace([
				{ toolName: 'screen_screenshot', args: {} },
				{ toolName: 'browser_click', args: { x: 10 } },
				{ toolName: 'screen_screenshot', args: {} },
			]),
			{ type: 'trace.mustNotLoop', maxRepeatedCall: 2 },
		);
		expect(result.pass).toBe(true);
	});

	it('fails when the same call is repeated past the limit', () => {
		const result = gradeMustNotLoop(
			trace([
				{ toolName: 'screen_screenshot', args: {} },
				{ toolName: 'screen_screenshot', args: {} },
				{ toolName: 'screen_screenshot', args: {} },
				{ toolName: 'screen_screenshot', args: {} },
			]),
			{ type: 'trace.mustNotLoop', maxRepeatedCall: 2 },
		);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain('looped');
	});

	it('treats different args as breaking the run', () => {
		const result = gradeMustNotLoop(
			trace([
				{ toolName: 'browser_click', args: { x: 1 } },
				{ toolName: 'browser_click', args: { x: 2 } },
				{ toolName: 'browser_click', args: { x: 3 } },
			]),
			{ type: 'trace.mustNotLoop', maxRepeatedCall: 2 },
		);
		expect(result.pass).toBe(true);
	});

	it('is order-insensitive on args keys', () => {
		const result = gradeMustNotLoop(
			trace([
				{ toolName: 'browser_click', args: { x: 1, y: 2 } },
				{ toolName: 'browser_click', args: { y: 2, x: 1 } },
				{ toolName: 'browser_click', args: { x: 1, y: 2 } },
			]),
			{ type: 'trace.mustNotLoop', maxRepeatedCall: 2 },
		);
		expect(result.pass).toBe(false);
	});
});

describe('trace.finalTextMatches', () => {
	function withText(text: string) {
		const t = trace([]);
		t.finalText = text;
		return t;
	}

	it('passes when anyOf has a hit', () => {
		const r = gradeFinalTextMatches(withText('I will use Browser Use to navigate'), {
			type: 'trace.finalTextMatches',
			anyOf: ['browser use|computer use'],
		});
		expect(r.pass).toBe(true);
	});

	it('fails when nothing matches', () => {
		const r = gradeFinalTextMatches(withText('Sorry, I cannot help.'), {
			type: 'trace.finalTextMatches',
			anyOf: ['browser use|computer use'],
		});
		expect(r.pass).toBe(false);
		expect(r.reason).toContain('does not match');
	});

	it('honors allOf', () => {
		const r = gradeFinalTextMatches(withText('Workflow uses HTTP and Slack on a schedule'), {
			type: 'trace.finalTextMatches',
			anyOf: ['workflow'],
			allOf: ['http', 'slack', 'schedule'],
		});
		expect(r.pass).toBe(true);
	});

	it('fails when allOf is partially satisfied', () => {
		const r = gradeFinalTextMatches(withText('Workflow uses HTTP and Slack'), {
			type: 'trace.finalTextMatches',
			anyOf: ['workflow'],
			allOf: ['http', 'slack', 'schedule'],
		});
		expect(r.pass).toBe(false);
	});
});

describe('trace.budget', () => {
	it('passes when both metrics are within budget', () => {
		const t = trace([{ toolName: 'a' }, { toolName: 'b' }]);
		t.durationMs = 5_000;
		const result = gradeBudget(t, {
			type: 'trace.budget',
			maxToolCalls: 5,
			maxDurationMs: 10_000,
		});
		expect(result.pass).toBe(true);
	});

	it('fails when tool call count exceeds limit', () => {
		const t = trace(Array.from({ length: 10 }, () => ({ toolName: 'a' })));
		const result = gradeBudget(t, { type: 'trace.budget', maxToolCalls: 5 });
		expect(result.pass).toBe(false);
		expect(result.reason).toContain('tool calls');
	});
});

describe('trace.finalTextMatches mustNotMatch', () => {
	it('fails when an abandonment phrase appears even though anyOf hits', () => {
		const t = trace([]);
		t.finalText = 'The Google Cloud Console is taking a while to load. Let me try a differe';
		const result = gradeFinalTextMatches(t, {
			type: 'trace.finalTextMatches',
			anyOf: ['google.*cloud'],
			mustNotMatch: ['taking a while', 'let me try a different'],
		});
		expect(result.pass).toBe(false);
		expect(result.reason).toContain('abandoned');
	});

	it('passes when forbidden patterns are absent', () => {
		const t = trace([]);
		t.finalText = 'Created Google Cloud project and OAuth credentials successfully.';
		const result = gradeFinalTextMatches(t, {
			type: 'trace.finalTextMatches',
			anyOf: ['google.*cloud'],
			mustNotMatch: ['taking a while'],
		});
		expect(result.pass).toBe(true);
	});

	it('ignores forbidden phrases that appear mid-stream when the closing summary is clean', () => {
		// `finalText` is the concatenation of every text-delta event, so mid-flight
		// pivot phrases live in the same blob as the closing message. They should
		// not be read as abandonment when the agent went on to deliver a real summary
		// long enough to push the pivot phrase out of the trailing slice.
		const t = trace([]);
		const midStream = 'Let me try a different approach - using JavaScript instead. ';
		const closingSummary =
			'I extracted the scenario blueprint from the network response. The Make.com scenario has two modules: a Webhooks trigger and an HTTP GET request. Would you like me to recreate this in n8n? '.repeat(
				20,
			);
		t.finalText = midStream + closingSummary;
		const result = gradeFinalTextMatches(t, {
			type: 'trace.finalTextMatches',
			anyOf: ['make\\.com|scenario|module'],
			mustNotMatch: ['let me try (a )?different', 'unable to (load|access|reach)'],
		});
		expect(result.pass).toBe(true);
	});

	it('still catches forbidden phrases that appear at the tail of the text', () => {
		const t = trace([]);
		t.finalText =
			'I tried navigating to the page and inspecting the DOM. ' +
			'Sorry, I was unable to load the scenario.';
		const result = gradeFinalTextMatches(t, {
			type: 'trace.finalTextMatches',
			anyOf: ['scenario'],
			mustNotMatch: ['unable to (load|access|reach)'],
		});
		expect(result.pass).toBe(false);
		expect(result.reason).toContain('abandoned');
	});
});

describe('trace.mustReachUrl', () => {
	it('passes when browser_navigate args contain a URL matching the pattern', () => {
		const result = gradeMustReachUrl(
			trace([
				{ toolName: 'browser_connect' },
				{
					toolName: 'browser_navigate',
					args: { url: 'https://console.anthropic.com/settings/keys' },
				},
			]),
			{ type: 'trace.mustReachUrl', pattern: 'console\\.anthropic\\.com/settings/keys' },
		);
		expect(result.pass).toBe(true);
	});

	it('passes when the URL is on browser_tab_open instead of browser_navigate', () => {
		const result = gradeMustReachUrl(
			trace([
				{
					toolName: 'browser_tab_open',
					args: { url: 'https://console.anthropic.com/settings/keys' },
				},
			]),
			{ type: 'trace.mustReachUrl', pattern: 'console\\.anthropic\\.com/settings/keys' },
		);
		expect(result.pass).toBe(true);
	});

	it('fails when no browser tool reached a matching URL and lists what was visited', () => {
		const result = gradeMustReachUrl(
			trace([{ toolName: 'browser_navigate', args: { url: 'https://console.cloud.google.com' } }]),
			{
				type: 'trace.mustReachUrl',
				pattern: 'console\\.cloud\\.google\\.com/projectcreate',
			},
		);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain('console.cloud.google.com');
	});

	it('ignores URL-like args on tools outside the prefix scope', () => {
		const result = gradeMustReachUrl(
			trace([{ toolName: 'shell_execute', args: { url: 'https://example.com/curl' } }]),
			{ type: 'trace.mustReachUrl', pattern: 'example\\.com' },
		);
		expect(result.pass).toBe(false);
	});
});

describe('trace.toolsMustNotError', () => {
	it('passes when no browser_* call has an error', () => {
		const result = gradeToolsMustNotError(
			trace([
				{ toolName: 'browser_connect' },
				{ toolName: 'browser_navigate', args: { url: 'https://example.com' } },
			]),
			{ type: 'trace.toolsMustNotError' },
		);
		expect(result.pass).toBe(true);
	});

	it('fails when a browser_navigate call returned an error', () => {
		const result = gradeToolsMustNotError(
			trace([
				{ toolName: 'browser_connect' },
				{
					toolName: 'browser_navigate',
					args: { url: 'https://console.cloud.google.com' },
					error: 'navigation timeout',
				},
			]),
			{ type: 'trace.toolsMustNotError' },
		);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain('navigation timeout');
		expect(result.reason).toContain('browser_navigate');
	});

	it('respects maxErrors', () => {
		const result = gradeToolsMustNotError(
			trace([
				{ toolName: 'browser_navigate', error: 'timeout 1' },
				{ toolName: 'browser_tab_open', error: 'timeout 2' },
			]),
			{ type: 'trace.toolsMustNotError', maxErrors: 2 },
		);
		expect(result.pass).toBe(true);
	});

	it('ignores tools listed in ignoreTools', () => {
		const result = gradeToolsMustNotError(
			trace([{ toolName: 'pause-for-user', error: 'user cancelled' }]),
			{ type: 'trace.toolsMustNotError', toolNamePrefix: '' },
		);
		expect(result.pass).toBe(true);
	});

	it('skips errors on tools outside the prefix scope', () => {
		const result = gradeToolsMustNotError(trace([{ toolName: 'shell_execute', error: 'exit 1' }]), {
			type: 'trace.toolsMustNotError',
		});
		expect(result.pass).toBe(true);
	});
});
