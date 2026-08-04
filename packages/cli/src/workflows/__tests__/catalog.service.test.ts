import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ExecutionService } from '@/executions/execution.service';
import { CATALOG_RUN_USER_KEY } from '@/workflows/catalog-run.service';
import {
	CATALOG_LIST_LIMIT,
	CATALOG_RUNS_LIMIT,
	CatalogService,
} from '@/workflows/catalog.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowInputSchemaService } from '@/workflows/workflow-input-schema.service';

/** Bound to the finder's contract rather than a hand-picked entity type. */
type Candidate = Awaited<ReturnType<WorkflowFinderService['findAllWorkflowsForUser']>>[number];

const entity = (id: string, name = `Workflow ${id}`) =>
	mock<Candidate>({ id, name, description: null, nodes: [] });

describe('CatalogService', () => {
	const user = mock<User>({ id: 'user-1' });

	let service: CatalogService;
	let logger: ReturnType<typeof mock<Logger>>;
	let finder: ReturnType<typeof mock<WorkflowFinderService>>;
	let schemas: ReturnType<typeof mock<WorkflowInputSchemaService>>;
	let executions: ReturnType<typeof mock<ExecutionService>>;

	beforeEach(() => {
		logger = mock<Logger>();
		finder = mock<WorkflowFinderService>();
		schemas = mock<WorkflowInputSchemaService>();
		executions = mock<ExecutionService>();

		schemas.describe.mockResolvedValue({ eligible: true, fields: [] });
		executions.findRangeWithCount.mockResolvedValue({ results: [], count: 0, estimated: false });

		service = new CatalogService(logger, finder, schemas, executions);
	});

	it('should list only workflows the user may execute', async () => {
		finder.findAllWorkflowsForUser.mockResolvedValue([entity('a')]);

		await service.list(user);

		expect(finder.findAllWorkflowsForUser).toHaveBeenCalledWith(user, ['workflow:execute']);
	});

	it('should return the declared contract without the graph', async () => {
		finder.findAllWorkflowsForUser.mockResolvedValue([entity('a', 'Weekly report')]);
		schemas.describe.mockResolvedValue({
			eligible: true,
			fields: [{ name: 'customer', type: 'string' }],
		});

		const result = await service.list(user);

		expect(result.workflows).toEqual([
			{
				id: 'a',
				name: 'Weekly report',
				description: null,
				fields: [{ name: 'customer', type: 'string' }],
			},
		]);
	});

	it('should leave out workflows with no readable contract', async () => {
		finder.findAllWorkflowsForUser.mockResolvedValue([entity('a'), entity('b')]);
		schemas.describe
			.mockResolvedValueOnce({ eligible: true, fields: [] })
			.mockResolvedValueOnce({ eligible: false, reason: 'own-schedule' });

		const result = await service.list(user);

		expect(result.workflows.map((w) => w.id)).toEqual(['a']);
	});

	it('should return one entry for a workflow reachable by several share paths', async () => {
		finder.findAllWorkflowsForUser.mockResolvedValue([entity('a'), entity('a'), entity('b')]);

		const result = await service.list(user);

		expect(result.workflows.map((w) => w.id)).toEqual(['a', 'b']);
	});

	it('should report a complete listing as not truncated', async () => {
		finder.findAllWorkflowsForUser.mockResolvedValue([entity('a')]);

		const result = await service.list(user);

		expect(result.truncated).toBe(false);
	});

	it('should flag and log a listing the limit cut short', async () => {
		const candidates = Array.from({ length: CATALOG_LIST_LIMIT + 1 }, (_, i) => entity(`w-${i}`));
		finder.findAllWorkflowsForUser.mockResolvedValue(candidates);

		const result = await service.list(user);

		// A short list must never read as a complete one.
		expect(result.truncated).toBe(true);
		expect(result.workflows).toHaveLength(CATALOG_LIST_LIMIT);
		expect(logger.warn).toHaveBeenCalled();
	});

	describe('listRuns', () => {
		it('should select only runs the person started themselves', async () => {
			await service.listRuns(user);

			expect(executions.findRangeWithCount).toHaveBeenCalledWith(
				expect.objectContaining({
					user,
					metadata: [{ key: CATALOG_RUN_USER_KEY, value: 'user-1', exactMatch: true }],
					range: { limit: CATALOG_RUNS_LIMIT },
					order: { startedAt: 'DESC' },
				}),
			);
		});

		it('should scope visibility to workflows the person may execute', async () => {
			executions.buildSharingOptions.mockResolvedValue({ scopes: ['workflow:execute'] });

			await service.listRuns(user);

			expect(executions.buildSharingOptions).toHaveBeenCalledWith('workflow:execute');
			expect(executions.findRangeWithCount).toHaveBeenCalledWith(
				expect.objectContaining({ sharingOptions: { scopes: ['workflow:execute'] } }),
			);
		});

		it('should not expose node names through the run summary', async () => {
			executions.findRangeWithCount.mockResolvedValue({
				results: [
					{
						id: 'exec-1',
						workflowId: 'wf-1',
						workflowName: 'Weekly report',
						status: 'success',
						startedAt: new Date('2026-01-01'),
						stoppedAt: new Date('2026-01-02'),
						mode: 'trigger',
						createdAt: new Date('2026-01-01'),
						lastNodeExecuted: 'Send Email',
					},
				],
				count: 1,
				estimated: false,
			});

			const result = await service.listRuns(user);

			expect(result.runs).toEqual([
				{
					id: 'exec-1',
					workflowId: 'wf-1',
					workflowName: 'Weekly report',
					status: 'success',
					startedAt: new Date('2026-01-01'),
					stoppedAt: new Date('2026-01-02'),
				},
			]);
			expect(result).toEqual(expect.objectContaining({ count: 1, estimated: false }));
		});
	});
});
