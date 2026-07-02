import type { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type {
	IConnections,
	INode,
	INodeParameters,
	IPinData,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { NodeTypes } from '@/node-types';

import { extractResolvedNodeParameters } from '../extract-resolved-node-parameters';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockExecutionRepository(
	execution?: ReturnType<typeof makeResolutionExecution>,
): Mocked<Pick<ExecutionRepository, 'findSingleExecution'>> {
	const executionPersistence = mock<ExecutionPersistence>();
	executionPersistence.findSingleExecution.mockResolvedValue(execution as never);
	vi.spyOn(Container, 'get').mockReturnValue(executionPersistence as never);
	return {
		findSingleExecution: vi.fn().mockResolvedValue(execution),
	};
}

/** Build a task data entry with the given output items. */
function makeTaskData(
	outputItems: Array<Record<string, unknown>>,
	opts?: {
		source?: Array<{
			previousNode: string;
			previousNodeOutput?: number;
			previousNodeRun?: number;
		} | null>;
	},
): ITaskData {
	return {
		startTime: 1000,
		executionTime: 500,
		executionIndex: 0,
		source: opts?.source ?? [],
		data: {
			main: [outputItems.map((json) => ({ json }))],
		},
	} as unknown as ITaskData;
}

/**
 * Build a task data entry with multiple outputs (e.g., for a Switch/IF node that
 * routes items to different branches). `outputs` is keyed by output index.
 */
function makeMultiOutputTaskData(outputs: Array<Array<Record<string, unknown>>>): ITaskData {
	return {
		startTime: 1000,
		executionTime: 500,
		executionIndex: 0,
		source: [],
		data: {
			main: outputs.map((items) => items.map((json) => ({ json }))),
		},
	} as unknown as ITaskData;
}

/**
 * Build a complete execution fixture suitable for parameter-resolution tests:
 * includes the full workflow snapshot (nodes, connections, pinData) plus runData.
 */
function makeResolutionExecution(opts: {
	nodes: INode[];
	connections?: IConnections;
	runData?: Record<string, ITaskData[]>;
	pinData?: IPinData;
	mode?: string;
}) {
	return {
		id: 'exec-1',
		mode: opts.mode ?? 'manual',
		status: 'success',
		startedAt: new Date('2026-01-01T00:00:00Z'),
		stoppedAt: new Date('2026-01-01T00:01:00Z'),
		workflowData: {
			id: 'wf-1',
			name: 'Test Workflow',
			nodes: opts.nodes,
			connections: opts.connections ?? {},
			settings: {},
			pinData: opts.pinData,
		},
		data: {
			resultData: {
				runData: opts.runData ?? {},
			},
		} as unknown as IRunExecutionData,
	};
}

function makeNode(name: string, type: string, parameters: INodeParameters = {}): INode {
	return {
		id: name,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};
}

/** Connect `from` → `to` on the `main` connection (output index 0 → input index 0). */
function connect(from: string, to: string): IConnections {
	return {
		[from]: { main: [[{ node: to, type: 'main', index: 0 }]] },
	};
}

/**
 * Helper to assert and extract the JSON content from `resolved`, which is
 * wrapped in `<untrusted_data>` markers because resolved values can echo
 * upstream untrusted content.
 */
function parseResolved(resolved: string | null): Record<string, unknown> {
	if (resolved === null) {
		throw new Error('Expected resolved to be a wrapped string, got null');
	}
	expect(resolved).toContain('<untrusted_data');
	expect(resolved).toContain('source="execution-output"');
	expect(resolved).toContain('resolved-parameters:');
	const match = resolved.match(/<untrusted_data[^>]*>\n([\s\S]*)\n<\/untrusted_data>/);
	if (!match) throw new Error(`Could not extract content from wrapped resolved: ${resolved}`);
	return JSON.parse(match[1]) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('extractResolvedNodeParameters', () => {
	const nodeTypes = mock<NodeTypes>();

	it('resolves expressions against the parent node output and mirrors the parameter tree', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const params = {
			values: {
				url: '=https://api.example.com/users/{{ $json.userId }}',
				literal: 'static',
				count: 42,
				headers: {
					auth: '=Bearer {{ $json.token }}',
				},
			},
		};
		const set = makeNode('Set', 'n8n-nodes-base.set', params);
		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ userId: 99, token: 'abc' }])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Set');

		expect(result.nodeName).toBe('Set');
		expect(result.runIndex).toBe(0);
		expect(result.itemIndex).toBe(0);
		expect(result.failedExpressions).toEqual([]);
		expect(result.emptyResolutions).toEqual([]);
		// Raw parameters returned verbatim so the agent can correlate each resolved
		// value back to its source expression.
		expect(result.parameters).toEqual(params);
		expect(parseResolved(result.resolved)).toEqual({
			values: {
				url: 'https://api.example.com/users/99',
				literal: 'static',
				count: 42,
				headers: { auth: 'Bearer abc' },
			},
		});
	});

	it('tags emptyResolutions touching $vars (and other unreconstructable contexts) with reason="unreconstructable-context"', async () => {
		// $vars is injected as {} during replay, so $vars.foo silently resolves to
		// undefined. Without the tag, the agent reads this as a real workflow bug
		// — but it just means we don't reconstruct variables in the replay.
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', {
			fromVars: '={{ $vars.apiKey }}',
			fromSecrets: '={{ $secrets.token }}',
			realBug: '={{ $json.missing }}',
		});
		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{}])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Set');

		const byPath = new Map(result.emptyResolutions.map((e) => [e.path, e]));
		expect(byPath.get('fromVars')?.reason).toBe('unreconstructable-context');
		expect(byPath.get('fromSecrets')?.reason).toBe('unreconstructable-context');
		// `$json.missing` is a real "no value upstream" — no reason tag.
		expect(byPath.get('realBug')?.reason).toBeUndefined();
	});

	it('flags expressions that resolved to nullish/empty values in emptyResolutions', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', {
			// `$json.foo` is undefined → engine returns undefined (no throw)
			baz: '={{ $json.foo }}',
			// resolves cleanly
			value: '={{ $json.value }}',
			nested: {
				// also undefined via missing key
				bar: '={{ $json.missing }}',
			},
		});
		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ value: 'OK' }])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Set');

		expect(result.failedExpressions).toEqual([]);
		expect(result.emptyResolutions.map((e) => e.path).sort()).toEqual(['baz', 'nested.bar']);
		expect(result.emptyResolutions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'baz', raw: '={{ $json.foo }}' }),
				expect.objectContaining({ path: 'nested.bar', raw: '={{ $json.missing }}' }),
			]),
		);
	});

	it('records failed expressions with dot-path while resolving siblings', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', {
			good: '={{ $json.value }}',
			// `$()` on a non-existent node throws an ExpressionError. Plain optional-style
			// chains like `$json.foo.bar` resolve to `undefined` rather than throwing —
			// that's how the runtime itself behaves and matches what the editor shows.
			bad: '={{ $("DoesNotExist").item.json.foo }}',
			nested: {
				alsoBad: '={{ $("AlsoDoesNotExist").item.json.x }}',
				alsoGood: '={{ $json.value }}',
			},
		});
		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ value: 'OK' }])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Set');

		const resolved = parseResolved(result.resolved);
		const nested = resolved.nested as Record<string, unknown>;
		expect(resolved.good).toBe('OK');
		expect(resolved.bad).toBeNull();
		expect(nested.alsoGood).toBe('OK');
		expect(nested.alsoBad).toBeNull();
		expect(result.failedExpressions.map((f) => f.path).sort()).toEqual(['bad', 'nested.alsoBad']);
		for (const failure of result.failedExpressions) {
			expect(failure.reason).toBe('expression-error');
		}
	});

	it('throws when the execution does not exist', async () => {
		createMockExecutionRepository(undefined);

		await expect(extractResolvedNodeParameters(nodeTypes, 'missing', 'Anything')).rejects.toThrow(
			'Execution missing not found',
		);
	});

	it('throws when the node is not in the execution snapshot', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		createMockExecutionRepository(makeResolutionExecution({ nodes: [trigger], runData: {} }));

		await expect(extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Unknown')).rejects.toThrow(
			'Node "Unknown" not found in execution exec-1',
		);
	});

	it('defaults runIndex to the last run of the queried node and honors an explicit runIndex', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', { value: '={{ $json.tag }}' });
		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [
						makeTaskData([{ tag: 'first' }]),
						makeTaskData([{ tag: 'second' }]),
						makeTaskData([{ tag: 'third' }]),
					],
					// Set itself ran three times — that's what drives the default runIndex.
					Set: [makeTaskData([{}]), makeTaskData([{}]), makeTaskData([{}])],
				},
			}),
		);

		const last = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Set');
		expect(last.runIndex).toBe(2);
		expect(parseResolved(last.resolved)).toEqual({ value: 'third' });

		const first = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Set', { runIndex: 0 });
		expect(first.runIndex).toBe(0);
		expect(parseResolved(first.resolved)).toEqual({ value: 'first' });
	});

	it('captures item-index-out-of-range expressions as failed without throwing', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', { value: '={{ $json.value }}' });
		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ value: 'only-item' }])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Set', {
			itemIndex: 99,
		});

		expect(result.itemIndex).toBe(99);
		expect(parseResolved(result.resolved)).toEqual({ value: null });
		expect(result.failedExpressions).toHaveLength(1);
		expect(result.failedExpressions[0].path).toBe('value');
	});

	it('tags failures from unreconstructable contexts ($response, $pageCount) with reason="unreconstructable-context"', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const http = makeNode('HTTP Request', 'n8n-nodes-base.httpRequest', {
			url: 'https://example.com',
			pagination: {
				nextPageUrl: '={{ $response.body.nextUrl }}',
				stopOn: '={{ $pageCount > 5 }}',
			},
		});
		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, http],
				connections: connect('Trigger', 'HTTP Request'),
				runData: {
					Trigger: [makeTaskData([{}])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'HTTP Request');

		// Non-paginated parameters resolve fine; paginated ones either succeed (using
		// the stubbed empty $response/$pageCount) or fail. What we care about: any
		// failure that touches $response/$pageCount/$request is tagged correctly.
		for (const failure of result.failedExpressions) {
			const touchesUnreconstructable =
				failure.raw.includes('$response') ||
				failure.raw.includes('$request') ||
				failure.raw.includes('$pageCount');
			if (touchesUnreconstructable) {
				expect(failure.reason).toBe('unreconstructable-context');
			}
		}
	});

	it('truncates resolved values that exceed the per-leaf size cap', async () => {
		const huge = 'x'.repeat(20_000);
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', { body: '={{ $json.payload }}' });
		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ payload: huge }])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Set');

		const body = parseResolved(result.resolved).body as Record<string, unknown>;
		expect(body._truncated).toBe(true);
		expect(body.originalLength).toBe(huge.length);
		expect((body.preview as string).length).toBeLessThanOrEqual(8_000);
	});

	it('annotates connectionInputData with pairedItem so $("Node").item expressions resolve', async () => {
		// `$('Trigger').item.json.x` calls into WorkflowDataProxy.getPairedItem,
		// which requires each input item to carry a `pairedItem: { item, input }`
		// annotation. The runtime + editor both add this before evaluating; we
		// have to mirror that here or the expression throws "pairedItemNoInfo".
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', {
			fromUpstream: '={{ $("Trigger").item.json.greeting }}',
		});
		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ greeting: 'hello' }])],
					Set: [
						makeTaskData([{}], {
							source: [{ previousNode: 'Trigger', previousNodeOutput: 0, previousNodeRun: 0 }],
						}),
					],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Set');

		expect(result.failedExpressions).toEqual([]);
		expect(parseResolved(result.resolved)).toEqual({ fromUpstream: 'hello' });
	});

	it('uses currentNodeRun.source to pick the correct branch output (Switch / IF)', async () => {
		// Switch routes items to two outputs; current node is connected to output 1.
		// Without source-driven lookup, walking workflow parents would pick output 0
		// (or whichever findConnectionOutputIndex returns first), giving the wrong items.
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const switchNode = makeNode('Switch', 'n8n-nodes-base.switch');
		const branchB = makeNode('Branch B', 'n8n-nodes-base.set', { value: '={{ $json.label }}' });

		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, switchNode, branchB],
				connections: {
					Trigger: { main: [[{ node: 'Switch', type: 'main', index: 0 }]] },
					// Switch's output 1 → Branch B's input 0
					Switch: { main: [[], [{ node: 'Branch B', type: 'main', index: 0 }]] },
				},
				runData: {
					Trigger: [makeTaskData([{}])],
					Switch: [makeMultiOutputTaskData([[{ label: 'went-to-A' }], [{ label: 'went-to-B' }]])],
					'Branch B': [
						makeTaskData([{ label: 'went-to-B' }], {
							source: [{ previousNode: 'Switch', previousNodeOutput: 1, previousNodeRun: 0 }],
						}),
					],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Branch B');

		// Resolves against the Switch's output 1, not output 0.
		expect(parseResolved(result.resolved)).toEqual({ value: 'went-to-B' });
		expect(result.failedExpressions).toEqual([]);
		expect(result.emptyResolutions).toEqual([]);
	});

	it('uses currentNodeRun.source to pick the correct parent run (loops / SplitInBatches)', async () => {
		// A loop body runs once per iteration. The third body-node run consumed items
		// from the parent's third run. With source-driven lookup, parent run 2 is
		// fetched correctly. Walking parents by current's runIndex would coincidentally
		// match here, but only because indices align — this test pins the contract.
		const loopHead = makeNode('Loop', 'n8n-nodes-base.splitInBatches');
		const body = makeNode('Body', 'n8n-nodes-base.set', { value: '={{ $json.iter }}' });

		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [loopHead, body],
				connections: connect('Loop', 'Body'),
				runData: {
					Loop: [
						makeTaskData([{ iter: 'A' }]),
						makeTaskData([{ iter: 'B' }]),
						makeTaskData([{ iter: 'C' }]),
					],
					Body: [
						makeTaskData([{}], {
							source: [{ previousNode: 'Loop', previousNodeOutput: 0, previousNodeRun: 0 }],
						}),
						makeTaskData([{}], {
							source: [{ previousNode: 'Loop', previousNodeOutput: 0, previousNodeRun: 1 }],
						}),
						makeTaskData([{}], {
							source: [{ previousNode: 'Loop', previousNodeOutput: 0, previousNodeRun: 2 }],
						}),
					],
				},
			}),
		);

		// Inspect the second body run (runIndex=1) — its source points at Loop run 1 ("B").
		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Body', {
			runIndex: 1,
		});

		expect(parseResolved(result.resolved)).toEqual({ value: 'B' });
	});

	it('resolves against recorded runData even when the snapshot still has pinData (historical reality wins)', async () => {
		// Pinned-node outputs are captured into runData at execution time, so runData
		// is the authoritative record of what actually flowed in the past execution.
		// We must not silently substitute in whatever pinData happens to be on the
		// saved workflow snapshot — that would shadow the recorded reality.
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', { value: '={{ $json.source }}' });
		createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ source: 'from-runData' }])],
				},
				pinData: {
					Trigger: [{ json: { source: 'from-pinData' } }],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(nodeTypes, 'exec-1', 'Set');

		expect(parseResolved(result.resolved)).toEqual({ value: 'from-runData' });
	});
});
