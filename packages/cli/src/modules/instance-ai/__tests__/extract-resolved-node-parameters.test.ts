import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type {
	IConnections,
	INode,
	INodeParameters,
	IPinData,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';

import { extractResolvedNodeParameters } from '../extract-resolved-node-parameters';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockExecutionRepository(
	execution?: ReturnType<typeof makeResolutionExecution>,
): jest.Mocked<Pick<ExecutionRepository, 'findSingleExecution'>> {
	return {
		findSingleExecution: jest.fn().mockResolvedValue(execution),
	};
}

/** Build a task data entry with the given output items. */
function makeTaskData(outputItems: Array<Record<string, unknown>>): ITaskData {
	return {
		startTime: 1000,
		executionTime: 500,
		executionIndex: 0,
		source: [],
		data: {
			main: [outputItems.map((json) => ({ json }))],
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
		const repo = createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ userId: 99, token: 'abc' }])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(
			repo as unknown as ExecutionRepository,
			nodeTypes,
			'exec-1',
			'Set',
		);

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
		const repo = createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ value: 'OK' }])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(
			repo as unknown as ExecutionRepository,
			nodeTypes,
			'exec-1',
			'Set',
		);

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
		const repo = createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ value: 'OK' }])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(
			repo as unknown as ExecutionRepository,
			nodeTypes,
			'exec-1',
			'Set',
		);

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
		const repo = createMockExecutionRepository(undefined);

		await expect(
			extractResolvedNodeParameters(
				repo as unknown as ExecutionRepository,
				nodeTypes,
				'missing',
				'Anything',
			),
		).rejects.toThrow('Execution missing not found');
	});

	it('throws when the node is not in the execution snapshot', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const repo = createMockExecutionRepository(
			makeResolutionExecution({ nodes: [trigger], runData: {} }),
		);

		await expect(
			extractResolvedNodeParameters(
				repo as unknown as ExecutionRepository,
				nodeTypes,
				'exec-1',
				'Unknown',
			),
		).rejects.toThrow('Node "Unknown" not found in execution exec-1');
	});

	it('defaults runIndex to the last run of the queried node and honors an explicit runIndex', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', { value: '={{ $json.tag }}' });
		const repo = createMockExecutionRepository(
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

		const last = await extractResolvedNodeParameters(
			repo as unknown as ExecutionRepository,
			nodeTypes,
			'exec-1',
			'Set',
		);
		expect(last.runIndex).toBe(2);
		expect(parseResolved(last.resolved)).toEqual({ value: 'third' });

		const first = await extractResolvedNodeParameters(
			repo as unknown as ExecutionRepository,
			nodeTypes,
			'exec-1',
			'Set',
			{ runIndex: 0 },
		);
		expect(first.runIndex).toBe(0);
		expect(parseResolved(first.resolved)).toEqual({ value: 'first' });
	});

	it('captures item-index-out-of-range expressions as failed without throwing', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', { value: '={{ $json.value }}' });
		const repo = createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ value: 'only-item' }])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(
			repo as unknown as ExecutionRepository,
			nodeTypes,
			'exec-1',
			'Set',
			{ itemIndex: 99 },
		);

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
		const repo = createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, http],
				connections: connect('Trigger', 'HTTP Request'),
				runData: {
					Trigger: [makeTaskData([{}])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(
			repo as unknown as ExecutionRepository,
			nodeTypes,
			'exec-1',
			'HTTP Request',
		);

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
		const repo = createMockExecutionRepository(
			makeResolutionExecution({
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				runData: {
					Trigger: [makeTaskData([{ payload: huge }])],
				},
			}),
		);

		const result = await extractResolvedNodeParameters(
			repo as unknown as ExecutionRepository,
			nodeTypes,
			'exec-1',
			'Set',
		);

		const body = parseResolved(result.resolved).body as Record<string, unknown>;
		expect(body._truncated).toBe(true);
		expect(body.originalLength).toBe(huge.length);
		expect((body.preview as string).length).toBeLessThanOrEqual(8_000);
	});

	it('uses pinData on the parent when present (wins over runData)', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', { value: '={{ $json.source }}' });
		const repo = createMockExecutionRepository(
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

		const result = await extractResolvedNodeParameters(
			repo as unknown as ExecutionRepository,
			nodeTypes,
			'exec-1',
			'Set',
		);

		expect(parseResolved(result.resolved)).toEqual({ value: 'from-pinData' });
	});
});
