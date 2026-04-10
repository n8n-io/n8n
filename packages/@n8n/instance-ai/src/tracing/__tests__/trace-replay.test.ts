import { IdRemapper, TraceIndex } from '../trace-replay';
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
