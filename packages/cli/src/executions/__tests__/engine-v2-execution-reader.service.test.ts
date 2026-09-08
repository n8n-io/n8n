import type { ExecutionSnapshot, ExecutionStatus, StepDetail, WorkflowDocument } from '@n8n/engine';
import type { ExecutionSummaries } from '@n8n/db';
import type { ExecutionStatus as ExecutionStatusV1 } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import { EngineV2ExecutionReader } from '../engine-v2-execution-reader.service';
import type { ExecutionIdV2 } from '../execution-id';

const EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa' as ExecutionIdV2;
const WORKFLOW_ID = 'wf-1';

const step = (overrides: Partial<StepDetail> = {}): StepDetail => ({
	id: 'step-1',
	nodeId: 'trigger-id',
	iteration: 0,
	status: 'completed',
	outputs: [[{ json: { hello: 'world' } }]],
	error: null,
	createdAt: '2026-08-25T10:00:00.000Z',
	updatedAt: '2026-08-25T10:00:00.000Z',
	...overrides,
});

/** The workflow as it was when the run started, as the data plane stored it. */
const workflowDocument = (overrides: WorkflowDocument = {}): WorkflowDocument => ({
	id: WORKFLOW_ID,
	name: 'v2',
	nodes: [{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }],
	connections: {},
	settings: { engineType: 'v2' },
	nodeGroups: [],
	...overrides,
});

const snapshot = (overrides: Partial<ExecutionSnapshot> = {}): ExecutionSnapshot => ({
	id: EXECUTION_ID,
	workflowId: WORKFLOW_ID,
	status: 'completed',
	mode: 'manual',
	graph: { nodes: [{ id: 'trigger-id', name: 'Trigger', type: 'trigger' }], edges: [] },
	workflow: workflowDocument(),
	createdAt: '2026-08-25T10:00:00.000Z',
	updatedAt: '2026-08-25T10:00:05.000Z',
	finishedAt: '2026-08-25T10:00:05.000Z',
	...overrides,
});

describe('EngineV2ExecutionReader', () => {
	const dataPlane = mock<EngineDataPlaneProxyService>();
	const reader = new EngineV2ExecutionReader(dataPlane);

	beforeEach(() => {
		vi.clearAllMocks();
		dataPlane.getExecution.mockResolvedValue(snapshot());
		dataPlane.searchExecutions.mockResolvedValue({ items: [], total: 0, hasMore: false });
	});

	describe('findMany', () => {
		const query: ExecutionSummaries.RangeQuery = { kind: 'range', range: { limit: 2 } };
		it.each(['manual', 'webhook', 'trigger'] as const)(
			'forwards the mode %s without conversion',
			async (mode) => {
				await reader.findMany({ ...query, mode }, ['wf-1']);
				expect(dataPlane.searchExecutions).toHaveBeenCalledWith(expect.objectContaining({ mode }));
			},
		);

		it('maps supported statuses and drops statuses that the DP cannot match', async () => {
			await reader.findMany({ ...query, status: ['success', 'crashed', 'waiting'] }, 'all');
			expect(dataPlane.searchExecutions).toHaveBeenCalledWith(
				expect.objectContaining({ status: ['completed'] }),
			);
			dataPlane.searchExecutions.mockClear();
			await reader.findMany({ ...query, status: ['crashed', 'waiting'] }, 'all');
			expect(dataPlane.searchExecutions).not.toHaveBeenCalled();
		});

		it('intersects the finished filter with statuses', async () => {
			await reader.findMany({ ...query, finished: false }, 'all');
			expect(dataPlane.searchExecutions).toHaveBeenCalledWith(
				expect.objectContaining({ status: ['queued', 'running', 'failed', 'cancelled'] }),
			);
			dataPlane.searchExecutions.mockClear();
			await reader.findMany({ ...query, finished: true, status: ['error'] }, 'all');
			expect(dataPlane.searchExecutions).not.toHaveBeenCalled();
		});

		it('deduplicates workflow IDs, merges batches, and sums their counts', async () => {
			const ids = Array.from({ length: 10_001 }, (_, i) => `wf-${i}`);
			const row = snapshot();
			dataPlane.searchExecutions.mockResolvedValueOnce({ items: [row], total: 8, hasMore: false });
			dataPlane.searchExecutions.mockResolvedValueOnce({
				items: [
					{
						...row,
						id: '01a038ae-c4a8-7799-8a3e-e3c2ca055cfb',
						createdAt: '2026-08-26T10:00:00.000Z',
					},
				],
				total: 3,
				hasMore: false,
			});
			const result = await reader.findMany({ ...query, range: { limit: 1 } }, [...ids, ids[0]]);
			expect(
				dataPlane.searchExecutions.mock.calls.map(([body]) => body.workflowIds.length),
			).toEqual([10_000, 1]);
			expect(result).toMatchObject({
				total: 11,
				hasMore: true,
				items: [{ id: '01a038ae-c4a8-7799-8a3e-e3c2ca055cfb', annotation: { tags: [] } }],
			});
			expect(dataPlane.getExecution).not.toHaveBeenCalled();
		});

		it('passes date bounds and the DP source position independently', async () => {
			await reader.findMany({ ...query, startedBefore: '2026-09-01' }, 'all', {
				id: EXECUTION_ID,
				timestamp: '2026-08-30T00:00:00.000Z',
			});
			expect(dataPlane.searchExecutions).toHaveBeenCalledWith(
				expect.objectContaining({
					createdBefore: '2026-09-01T00:00:00.000Z',
					before: { id: EXECUTION_ID, createdAt: '2026-08-30T00:00:00.000Z' },
				}),
			);
		});
	});

	describe('findOne', () => {
		it('should map the snapshot onto an execution response', async () => {
			const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

			expect(dataPlane.getExecution).toHaveBeenCalledWith(EXECUTION_ID, { includeSteps: true });
			expect(result).toEqual({
				id: EXECUTION_ID,
				workflowId: WORKFLOW_ID,
				mode: 'manual',
				status: 'success',
				finished: true,
				createdAt: new Date('2026-08-25T10:00:00.000Z'),
				startedAt: new Date('2026-08-25T10:00:00.000Z'),
				stoppedAt: new Date('2026-08-25T10:00:05.000Z'),
				storedAt: 'db',
				// The run-data mapping has its own tests. This one checks the envelope.
				data: expect.objectContaining({
					version: 1,
					resultData: expect.objectContaining({ runData: {} }),
				}),
				// `mock<T>` adds proxy symbols that break deep equality. The exact
				// field set has its own test.
				workflowData: expect.objectContaining({ id: WORKFLOW_ID, name: 'v2' }),
				customData: {},
				annotation: { tags: [] },
			});
		});

		it('should carry the workflow, so the redaction policy is resolvable', async () => {
			dataPlane.getExecution.mockResolvedValue(
				snapshot({ workflow: workflowDocument({ settings: { redactionPolicy: 'all' } }) }),
			);

			const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

			// The policy that was in force when the run started, not the current one.
			expect(result?.workflowData.settings?.redactionPolicy).toBe('all');
		});

		it('should report the same narrow workflow projection the v1 path reports', async () => {
			const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

			// Anything wider leaks the raw row, such as `shared` and its project.
			expect(Object.keys(result?.workflowData ?? {}).sort()).toEqual([
				'connections',
				'id',
				'name',
				'nodeGroups',
				'nodes',
				'settings',
			]);
		});

		it.each<[ExecutionStatus, ExecutionStatusV1, boolean]>([
			['queued', 'new', false],
			['running', 'running', false],
			['completed', 'success', true],
			['failed', 'error', false],
			['cancelled', 'canceled', false],
		])('should map status %j to %j', async (status, expected, finished) => {
			dataPlane.getExecution.mockResolvedValue(snapshot({ status }));

			const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

			expect(result?.status).toBe(expected);
			expect(result?.finished).toBe(finished);
		});

		it('should map a production run onto the v1 trigger mode', async () => {
			dataPlane.getExecution.mockResolvedValue(snapshot({ mode: 'production' }));

			const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

			expect(result?.mode).toBe('trigger');
		});

		it('should leave stoppedAt unset while the execution is unfinished', async () => {
			dataPlane.getExecution.mockResolvedValue(snapshot({ status: 'running', finishedAt: null }));

			const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

			expect(result?.stoppedAt).toBeUndefined();
		});

		it('should map the steps onto run data keyed by node name', async () => {
			dataPlane.getExecution.mockResolvedValue(snapshot({ steps: [step()] }));

			const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

			expect(result?.data.resultData.runData).toEqual({
				Trigger: [
					expect.objectContaining({
						executionStatus: 'success',
						data: { main: [[{ json: { hello: 'world' } }]] },
					}),
				],
			});
		});

		it('should report empty run data when the snapshot carries no steps', async () => {
			const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

			expect(result?.data.resultData.runData).toEqual({});
		});

		it('should return undefined when the data plane holds no such execution', async () => {
			dataPlane.getExecution.mockResolvedValue(undefined);

			await expect(reader.findOne(EXECUTION_ID, [WORKFLOW_ID])).resolves.toBeUndefined();
		});

		it('should return undefined when the workflow is not accessible to the caller', async () => {
			await expect(reader.findOne(EXECUTION_ID, ['other-wf'])).resolves.toBeUndefined();
		});

		it.each([
			['is empty', {}],
			['has no nodes', { id: WORKFLOW_ID, name: 'v2', connections: {} }],
			['has a non-array nodes', { nodes: 'Trigger' }],
		])('should return undefined when the stored workflow %s', async (_case, workflow) => {
			// Redaction walks `nodes` unguarded, so an unusable document must read
			// as no execution rather than reach it.
			dataPlane.getExecution.mockResolvedValue(snapshot({ workflow }));

			await expect(reader.findOne(EXECUTION_ID, [WORKFLOW_ID])).resolves.toBeUndefined();
		});

		describe('reporting the workflow that ran', () => {
			it('should report the node name from the run, not a later rename', async () => {
				dataPlane.getExecution.mockResolvedValue(snapshot({ steps: [step()] }));

				const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

				// The live workflow may now call this node anything; the read does not
				// consult it. The name matches the run-data key built from the graph.
				expect(result?.workflowData.nodes).toEqual([
					{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
				]);
				expect(Object.keys(result?.data.resultData.runData ?? {})).toEqual(['Trigger']);
			});

			it('should report a node the live workflow no longer has', async () => {
				dataPlane.getExecution.mockResolvedValue(
					snapshot({
						workflow: workflowDocument({
							nodes: [
								{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
								{ name: 'Deleted Later', type: 'n8n-nodes-base.set' },
							],
						}),
					}),
				);

				const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

				expect(result?.workflowData.nodes.map((node) => node.name)).toEqual([
					'Trigger',
					'Deleted Later',
				]);
			});

			it('should never read the workflow off the control plane', async () => {
				await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

				// One round trip, and it is the data plane's. The reader has no
				// workflow repository to reach for.
				expect(dataPlane.getExecution).toHaveBeenCalledTimes(1);
			});
		});
	});
});
