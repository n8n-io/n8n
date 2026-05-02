import { jsonParse } from 'n8n-workflow';

import { IdRemapper, TraceIndex, TraceWriter, parseTraceJsonl } from '../trace-replay';
import type { TraceToolCall, TraceToolSuspend, TraceToolResume, TraceEvent } from '../trace-replay';

// ── IdRemapper ──────────────────────────────────────────────────────────────

describe('IdRemapper', () => {
	describe('learn', () => {
		it('should learn string ID mappings from matching paths', () => {
			const remapper = new IdRemapper();
			remapper.learn(
				{ workflowId: 'old-wf-1', name: 'Test' },
				{ workflowId: 'new-wf-9', name: 'Test' },
			);

			expect(remapper.remapInput({ workflowId: 'old-wf-1' })).toEqual({
				workflowId: 'new-wf-9',
			});
		});

		it('should learn numeric ID mappings', () => {
			const remapper = new IdRemapper();
			remapper.learn({ id: 5 }, { id: 12 });

			expect(remapper.remapInput({ workflowId: '5' })).toEqual({ workflowId: '12' });
		});

		it('should learn IDs nested in objects', () => {
			const remapper = new IdRemapper();
			remapper.learn(
				{ result: { workflowId: 'old-1', nested: { credentialId: 'cred-1' } } },
				{ result: { workflowId: 'new-1', nested: { credentialId: 'cred-9' } } },
			);

			expect(remapper.remapInput({ workflowId: 'old-1', credentialId: 'cred-1' })).toEqual({
				workflowId: 'new-1',
				credentialId: 'cred-9',
			});
		});

		it('should learn IDs nested in arrays', () => {
			const remapper = new IdRemapper();
			remapper.learn(
				{ items: [{ workflowId: 'a' }, { workflowId: 'b' }] },
				{ items: [{ workflowId: 'x' }, { workflowId: 'y' }] },
			);

			expect(remapper.remapInput({ workflowId: 'a' })).toEqual({ workflowId: 'x' });
			expect(remapper.remapInput({ workflowId: 'b' })).toEqual({ workflowId: 'y' });
		});

		it('should ignore non-ID fields that differ', () => {
			const remapper = new IdRemapper();
			remapper.learn(
				{ workflowId: 'old-1', name: 'Recording Name', status: 'success' },
				{ workflowId: 'new-1', name: 'Different Name', status: 'error' },
			);

			// Only workflowId should be mapped, not name or status
			expect(remapper.remapInput({ name: 'Recording Name' })).toEqual({
				name: 'Recording Name',
			});
		});

		it('should not create mapping when values are equal', () => {
			const remapper = new IdRemapper();
			remapper.learn({ workflowId: 'same' }, { workflowId: 'same' });

			expect(remapper.remapInput({ workflowId: 'same' })).toEqual({ workflowId: 'same' });
		});

		it('should accumulate mappings across multiple learn calls', () => {
			const remapper = new IdRemapper();
			remapper.learn({ workflowId: 'wf-old' }, { workflowId: 'wf-new' });
			remapper.learn({ executionId: 'ex-old' }, { executionId: 'ex-new' });

			expect(remapper.remapInput({ workflowId: 'wf-old', executionId: 'ex-old' })).toEqual({
				workflowId: 'wf-new',
				executionId: 'ex-new',
			});
		});
	});

	describe('remapInput', () => {
		it('should replace IDs in string values', () => {
			const remapper = new IdRemapper();
			remapper.learn({ workflowId: 'abc' }, { workflowId: 'xyz' });

			expect(remapper.remapInput({ workflowId: 'abc' })).toEqual({ workflowId: 'xyz' });
		});

		it('should replace IDs embedded in larger strings', () => {
			const remapper = new IdRemapper();
			remapper.learn({ workflowId: 'wf-5' }, { workflowId: 'wf-12' });

			expect(remapper.remapInput({ url: '/workflows/wf-5/edit' })).toEqual({
				url: '/workflows/wf-12/edit',
			});
		});

		it('should replace numeric IDs', () => {
			const remapper = new IdRemapper();
			remapper.learn({ id: 5 }, { id: 12 });

			expect(remapper.remapInput({ workflowId: 5 })).toEqual({ workflowId: 12 });
		});

		it('should handle deeply nested input', () => {
			const remapper = new IdRemapper();
			remapper.learn({ workflowId: 'old' }, { workflowId: 'new' });

			expect(remapper.remapInput({ a: { b: { c: 'old' } } })).toEqual({
				a: { b: { c: 'new' } },
			});
		});

		it('should handle arrays in input', () => {
			const remapper = new IdRemapper();
			remapper.learn({ workflowId: 'old' }, { workflowId: 'new' });

			expect(remapper.remapInput({ ids: ['old', 'other'] })).toEqual({
				ids: ['new', 'other'],
			});
		});

		it('should return input unchanged when no mappings exist', () => {
			const remapper = new IdRemapper();
			const input = { workflowId: 'abc', data: [1, 2, 3] };

			expect(remapper.remapInput(input)).toEqual(input);
		});

		it('should not mutate the original input', () => {
			const remapper = new IdRemapper();
			remapper.learn({ workflowId: 'old' }, { workflowId: 'new' });

			const input = { workflowId: 'old' };
			remapper.remapInput(input);

			expect(input.workflowId).toBe('old');
		});

		it('should handle null and undefined values', () => {
			const remapper = new IdRemapper();
			remapper.learn({ workflowId: 'old' }, { workflowId: 'new' });

			expect(remapper.remapInput(null)).toBeNull();
			expect(remapper.remapInput(undefined)).toBeUndefined();
			expect(remapper.remapInput({ a: null, b: undefined })).toEqual({
				a: null,
				b: undefined,
			});
		});
	});

	describe('remapOutput', () => {
		it('should remap IDs in recorded output to current-run IDs', () => {
			const remapper = new IdRemapper();
			remapper.learn({ workflowId: 'old' }, { workflowId: 'new' });

			expect(remapper.remapOutput({ workflowId: 'old', data: 'stuff' })).toEqual({
				workflowId: 'new',
				data: 'stuff',
			});
		});
	});
});

// ── TraceIndex ──────────────────────────────────────────────────────────────

describe('TraceIndex', () => {
	const makeToolCall = (stepId: number, agentRole: string, toolName: string): TraceToolCall => ({
		kind: 'tool-call',
		stepId,
		agentRole,
		toolName,
		input: {},
		output: {},
	});

	const makeSuspend = (stepId: number, agentRole: string, toolName: string): TraceToolSuspend => ({
		kind: 'tool-suspend',
		stepId,
		agentRole,
		toolName,
		input: {},
		output: {},
		suspendPayload: {},
	});

	const makeResume = (stepId: number, agentRole: string, toolName: string): TraceToolResume => ({
		kind: 'tool-resume',
		stepId,
		agentRole,
		toolName,
		input: {},
		output: {},
		resumeData: {},
	});

	it('should advance cursor per agent role', () => {
		const events: TraceEvent[] = [
			{ kind: 'header', version: 1, testName: 'test', recordedAt: '' },
			makeToolCall(1, 'orchestrator', 'search-nodes'),
			makeToolCall(2, 'workflow-builder', 'build-workflow'),
			makeToolCall(3, 'orchestrator', 'run-workflow'),
		];

		const index = new TraceIndex(events);

		const e1 = index.next('orchestrator', 'search-nodes');
		expect(e1.stepId).toBe(1);

		const e2 = index.next('workflow-builder', 'build-workflow');
		expect(e2.stepId).toBe(2);

		const e3 = index.next('orchestrator', 'run-workflow');
		expect(e3.stepId).toBe(3);
	});

	it('should throw on tool name mismatch', () => {
		const events: TraceEvent[] = [makeToolCall(1, 'orchestrator', 'search-nodes')];

		const index = new TraceIndex(events);

		expect(() => index.next('orchestrator', 'wrong-tool')).toThrow(
			/Tool mismatch.*expected "wrong-tool".*trace has "search-nodes"/,
		);
	});

	it('should throw when trace is exhausted', () => {
		const events: TraceEvent[] = [makeToolCall(1, 'orchestrator', 'search-nodes')];

		const index = new TraceIndex(events);
		index.next('orchestrator', 'search-nodes');

		expect(() => index.next('orchestrator', 'another-tool')).toThrow(
			/Trace exhausted for role "orchestrator"/,
		);
	});

	it('should throw for unknown agent role', () => {
		const events: TraceEvent[] = [makeToolCall(1, 'orchestrator', 'search-nodes')];

		const index = new TraceIndex(events);

		expect(() => index.next('unknown-role', 'search-nodes')).toThrow(
			/Trace exhausted for role "unknown-role"/,
		);
	});

	it('should scan forward for a matching tool when requested', () => {
		const events: TraceEvent[] = [
			makeToolCall(1, 'orchestrator', 'credentials'),
			makeToolCall(2, 'orchestrator', 'build-workflow-with-agent'),
			makeToolCall(3, 'orchestrator', 'plan'),
		];

		const index = new TraceIndex(events);

		expect(index.nextMatching('orchestrator', 'plan')?.stepId).toBe(3);
		expect(index.nextMatching('orchestrator', 'credentials')).toBeNull();
	});

	it('should return null from matching lookup when trace is exhausted or role is unknown', () => {
		const events: TraceEvent[] = [makeToolCall(1, 'orchestrator', 'search-nodes')];

		const index = new TraceIndex(events);

		expect(index.nextMatching('unknown-role', 'search-nodes')).toBeNull();
		expect(index.nextMatching('orchestrator', 'search-nodes')?.stepId).toBe(1);
		expect(index.nextMatching('orchestrator', 'another-tool')).toBeNull();
	});

	it('should handle interleaved orchestrator and sub-agent calls', () => {
		const events: TraceEvent[] = [
			makeToolCall(1, 'orchestrator', 'tool-a'),
			makeToolCall(2, 'builder', 'tool-b'),
			makeToolCall(3, 'builder', 'tool-c'),
			makeToolCall(4, 'orchestrator', 'tool-d'),
			makeToolCall(5, 'builder', 'tool-e'),
		];

		const index = new TraceIndex(events);

		expect(index.next('orchestrator', 'tool-a').stepId).toBe(1);
		expect(index.next('builder', 'tool-b').stepId).toBe(2);
		expect(index.next('builder', 'tool-c').stepId).toBe(3);
		expect(index.next('orchestrator', 'tool-d').stepId).toBe(4);
		expect(index.next('builder', 'tool-e').stepId).toBe(5);
	});

	it('should handle suspend and resume events', () => {
		const events: TraceEvent[] = [
			makeToolCall(1, 'orchestrator', 'build-workflow'),
			makeSuspend(2, 'orchestrator', 'run-workflow'),
			makeResume(3, 'orchestrator', 'run-workflow'),
		];

		const index = new TraceIndex(events);

		expect(index.next('orchestrator', 'build-workflow').kind).toBe('tool-call');
		expect(index.next('orchestrator', 'run-workflow').kind).toBe('tool-suspend');
		expect(index.next('orchestrator', 'run-workflow').kind).toBe('tool-resume');
	});

	it('should filter out header events', () => {
		const events: TraceEvent[] = [
			{ kind: 'header', version: 1, testName: 'test', recordedAt: '' },
			makeToolCall(1, 'orchestrator', 'search-nodes'),
		];

		const index = new TraceIndex(events);
		const event = index.next('orchestrator', 'search-nodes');
		expect(event.stepId).toBe(1);
	});
});

// ── TraceWriter ──────────────────────────────────────────────────────────────

describe('TraceWriter', () => {
	it('should record a header event on construction', () => {
		const writer = new TraceWriter('my-test');
		const events = writer.getEvents();

		expect(events).toHaveLength(1);
		expect(events[0].kind).toBe('header');
		const header = events[0] as TraceEvent & { kind: 'header' };
		expect(header.version).toBe(1);
		expect(header.testName).toBe('my-test');
		expect(header.recordedAt).toBeDefined();
	});

	it('should record tool-call events with incrementing stepIds', () => {
		const writer = new TraceWriter('test');
		writer.recordToolCall('orchestrator', 'search-nodes', { q: 'http' }, { results: [] });
		writer.recordToolCall('builder', 'build-workflow', { nodes: [] }, { workflowId: '5' });

		const events = writer.getEvents();
		expect(events).toHaveLength(3); // header + 2 tool-calls

		const call1 = events[1] as TraceToolCall;
		expect(call1.kind).toBe('tool-call');
		expect(call1.stepId).toBe(1);
		expect(call1.agentRole).toBe('orchestrator');
		expect(call1.toolName).toBe('search-nodes');
		expect(call1.input).toEqual({ q: 'http' });
		expect(call1.output).toEqual({ results: [] });

		const call2 = events[2] as TraceToolCall;
		expect(call2.stepId).toBe(2);
		expect(call2.agentRole).toBe('builder');
		expect(call2.toolName).toBe('build-workflow');
	});

	it('should record tool-suspend events', () => {
		const writer = new TraceWriter('test');
		writer.recordToolSuspend(
			'orchestrator',
			'run-workflow',
			{ workflowId: '5' },
			{ denied: true },
			{ reason: 'needs approval' },
		);

		const events = writer.getEvents();
		const suspend = events[1] as TraceToolSuspend;
		expect(suspend.kind).toBe('tool-suspend');
		expect(suspend.stepId).toBe(1);
		expect(suspend.suspendPayload).toEqual({ reason: 'needs approval' });
	});

	it('should record tool-resume events', () => {
		const writer = new TraceWriter('test');
		writer.recordToolResume(
			'orchestrator',
			'run-workflow',
			{ workflowId: '5' },
			{ executionId: 'exec-1' },
			{ approved: true },
		);

		const events = writer.getEvents();
		const resume = events[1] as TraceToolResume;
		expect(resume.kind).toBe('tool-resume');
		expect(resume.stepId).toBe(1);
		expect(resume.resumeData).toEqual({ approved: true });
	});

	it('should return a copy of events from getEvents', () => {
		const writer = new TraceWriter('test');
		writer.recordToolCall('orch', 'tool-a', {}, {});

		const first = writer.getEvents();
		const second = writer.getEvents();
		expect(first).not.toBe(second);
		expect(first).toEqual(second);
	});

	it('should serialize events to JSONL format', () => {
		const writer = new TraceWriter('test');
		writer.recordToolCall('orch', 'search-nodes', { q: 'http' }, { results: [] });

		const jsonl = writer.toJsonl();
		const lines = jsonl.trim().split('\n');
		expect(lines).toHaveLength(2); // header + 1 tool-call

		const header = jsonParse<{ kind: string }>(lines[0]);
		expect(header.kind).toBe('header');

		const call = jsonParse<{ kind: string; toolName: string }>(lines[1]);
		expect(call.kind).toBe('tool-call');
		expect(call.toolName).toBe('search-nodes');
	});
});

// ── parseTraceJsonl ──────────────────────────────────────────────────────────

describe('parseTraceJsonl', () => {
	it('should parse JSONL into TraceEvent array', () => {
		const jsonl = [
			JSON.stringify({ kind: 'header', version: 1, testName: 'test', recordedAt: '2026-01-01' }),
			JSON.stringify({
				kind: 'tool-call',
				stepId: 1,
				agentRole: 'orch',
				toolName: 'search',
				input: {},
				output: {},
			}),
		].join('\n');

		const events = parseTraceJsonl(jsonl);
		expect(events).toHaveLength(2);
		expect(events[0].kind).toBe('header');
		expect(events[1].kind).toBe('tool-call');
	});

	it('should handle trailing newline', () => {
		const jsonl =
			JSON.stringify({ kind: 'header', version: 1, testName: 'test', recordedAt: '' }) + '\n';
		const events = parseTraceJsonl(jsonl);
		expect(events).toHaveLength(1);
	});

	it('should handle empty string', () => {
		expect(parseTraceJsonl('')).toEqual([]);
	});

	it('should roundtrip with TraceWriter', () => {
		const writer = new TraceWriter('roundtrip-test');
		writer.recordToolCall('orch', 'build-workflow', { nodes: [] }, { workflowId: '5' });
		writer.recordToolSuspend('orch', 'run-workflow', { workflowId: '5' }, {}, { ask: true });

		const parsed = parseTraceJsonl(writer.toJsonl());
		expect(parsed).toHaveLength(3);
		expect(parsed[0].kind).toBe('header');
		expect(parsed[1].kind).toBe('tool-call');
		expect(parsed[2].kind).toBe('tool-suspend');
		expect((parsed[1] as TraceToolCall).output).toEqual({ workflowId: '5' });
	});

	it('should throw when a line is not an object', () => {
		expect(() => parseTraceJsonl('42')).toThrow(/line 1/i);
		expect(() => parseTraceJsonl('null')).toThrow(/line 1/i);
		expect(() => parseTraceJsonl('"hello"')).toThrow(/line 1/i);
	});

	it('should throw when an event is missing the kind field', () => {
		const jsonl = JSON.stringify({ stepId: 1, agentRole: 'orch' });
		expect(() => parseTraceJsonl(jsonl)).toThrow(/kind/i);
	});

	it('should throw on unknown kind value', () => {
		const jsonl = JSON.stringify({ kind: 'mystery-event', stepId: 1 });
		expect(() => parseTraceJsonl(jsonl)).toThrow(/mystery-event/);
	});

	it('should report the offending line number for the second invalid line', () => {
		const jsonl = [
			JSON.stringify({ kind: 'header', version: 1, testName: 't', recordedAt: '' }),
			JSON.stringify({ kind: 'banana' }),
		].join('\n');
		expect(() => parseTraceJsonl(jsonl)).toThrow(/line 2/i);
	});
});
