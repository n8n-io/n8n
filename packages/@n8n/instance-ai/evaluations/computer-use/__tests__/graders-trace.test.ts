import type { CapturedToolCall } from '../../types';
import {
	gradeBudget,
	gradeFinalTextMatches,
	gradeMustCallMcpServer,
	gradeMustCallTool,
	gradeMustNotCallMcpServer,
	gradeMustNotCallTool,
	gradeMustNotLoop,
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
