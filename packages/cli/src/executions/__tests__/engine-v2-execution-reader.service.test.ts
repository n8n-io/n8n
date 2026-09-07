import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import type { ExecutionSnapshot, ExecutionStatus, StepDetail } from '@n8n/engine';
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

const snapshot = (overrides: Partial<ExecutionSnapshot> = {}): ExecutionSnapshot => ({
	id: EXECUTION_ID,
	workflowId: WORKFLOW_ID,
	status: 'completed',
	mode: 'manual',
	graph: { nodes: [{ id: 'trigger-id', name: 'Trigger', type: 'trigger' }], edges: [] },
	createdAt: '2026-08-25T10:00:00.000Z',
	updatedAt: '2026-08-25T10:00:05.000Z',
	finishedAt: '2026-08-25T10:00:05.000Z',
	...overrides,
});

describe('EngineV2ExecutionReader', () => {
	const dataPlane = mock<EngineDataPlaneProxyService>();
	const workflowRepository = mock<WorkflowRepository>();
	const reader = new EngineV2ExecutionReader(dataPlane, workflowRepository);

	const workflow = mock<WorkflowEntity>({
		id: WORKFLOW_ID,
		name: 'v2',
		nodes: [],
		connections: {},
		nodeGroups: [],
		settings: { engineType: 'v2' },
	});

	beforeEach(() => {
		vi.clearAllMocks();
		dataPlane.getExecution.mockResolvedValue(snapshot());
		workflowRepository.findById.mockResolvedValue(workflow);
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
			workflowRepository.findById.mockResolvedValue(
				mock<WorkflowEntity>({ id: WORKFLOW_ID, nodes: [], settings: { redactionPolicy: 'all' } }),
			);

			const result = await reader.findOne(EXECUTION_ID, [WORKFLOW_ID]);

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
			expect(workflowRepository.findById).not.toHaveBeenCalled();
		});

		it('should return undefined when the workflow is not accessible to the caller', async () => {
			await expect(reader.findOne(EXECUTION_ID, ['other-wf'])).resolves.toBeUndefined();
			expect(workflowRepository.findById).not.toHaveBeenCalled();
		});

		it('should return undefined when the workflow is gone', async () => {
			workflowRepository.findById.mockResolvedValue(null);

			await expect(reader.findOne(EXECUTION_ID, [WORKFLOW_ID])).resolves.toBeUndefined();
		});
	});
});
