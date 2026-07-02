import type { Project, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { DataTable } from '@/modules/data-table/data-table.entity';
import type { DataTableService } from '@/modules/data-table/data-table.service';

import { EvalThreadRestoreService } from '../thread-restore.service';

function makeNode(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 'node-1',
		name: 'Slack',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.2,
		position: [100, 200],
		parameters: { channel: '#cosmic-otter-alerts' },
		...overrides,
	};
}

describe('EvalThreadRestoreService', () => {
	const workflowRepo = mock<WorkflowRepository>();
	const sharedWorkflowRepo = mock<SharedWorkflowRepository>();
	const dataTableService = mock<DataTableService>();
	const service = new EvalThreadRestoreService(workflowRepo, sharedWorkflowRepo, dataTableService);

	beforeEach(() => {
		vi.clearAllMocks();
		workflowRepo.create.mockImplementation((entity) => entity as never);
		sharedWorkflowRepo.getWorkflowOwningProject.mockResolvedValue(undefined);
	});

	it('recreates the workflow pinned to its seeded id and grants project ownership', async () => {
		await service.restoreWorkflows(
			[{ id: 'wf-original', name: 'Daily digest', nodes: [makeNode()], connections: {} }],
			'project-1',
		);

		expect(workflowRepo.save).toHaveBeenCalledTimes(1);
		const saved = workflowRepo.create.mock.calls[0][0];
		expect(saved).toMatchObject({
			id: 'wf-original',
			name: 'Daily digest',
			active: false,
		});
		expect(saved.versionId).toEqual(expect.any(String));
		expect(sharedWorkflowRepo.makeOwner).toHaveBeenCalledWith(['wf-original'], 'project-1');
	});

	it('strips pre-attached node credentials so they cannot bypass the credential pin', async () => {
		const node = makeNode({
			credentials: { slackApi: { id: 'cred-from-source-instance', name: 'Slack' } },
		});

		await service.restoreWorkflows(
			[{ id: 'wf-1', name: 'wf', nodes: [node], connections: {} }],
			'project-1',
		);

		const saved = workflowRepo.create.mock.calls[0][0];
		expect(saved.nodes).toHaveLength(1);
		expect(saved.nodes?.[0]).not.toHaveProperty('credentials');
		expect(saved.nodes?.[0]).toMatchObject({ name: 'Slack', parameters: expect.any(Object) });
	});

	it('does not re-grant ownership when the workflow already exists in this project', async () => {
		sharedWorkflowRepo.getWorkflowOwningProject.mockResolvedValue({ id: 'project-1' } as Project);

		const created = await service.restoreWorkflows(
			[{ id: 'wf-1', name: 'wf', nodes: [makeNode()], connections: {} }],
			'project-1',
		);

		expect(workflowRepo.save).toHaveBeenCalledTimes(1);
		expect(sharedWorkflowRepo.makeOwner).not.toHaveBeenCalled();
		expect(created).toEqual([]); // not newly created
	});

	it('refuses to overwrite a workflow owned by another project', async () => {
		sharedWorkflowRepo.getWorkflowOwningProject.mockResolvedValue({
			id: 'other-project',
		} as Project);

		await expect(
			service.restoreWorkflows(
				[{ id: 'wf-1', name: 'wf', nodes: [makeNode()], connections: {} }],
				'project-1',
			),
		).rejects.toThrow(BadRequestError);
		expect(workflowRepo.save).not.toHaveBeenCalled();
	});

	it('rejects a structurally invalid node without writing anything', async () => {
		await expect(
			service.restoreWorkflows(
				[{ id: 'wf-1', name: 'wf', nodes: [{ name: 'no type' }], connections: {} }],
				'project-1',
			),
		).rejects.toThrow(BadRequestError);
		expect(workflowRepo.save).not.toHaveBeenCalled();
	});

	describe('data tables', () => {
		it('recreates each table (schema only) under a unique name and maps the id', async () => {
			dataTableService.createDataTable.mockResolvedValue(mock<DataTable>({ id: 'dt-new' }));

			const idMap = await service.restoreDataTables(
				[
					{
						id: 'dt-old-1234',
						name: 'Size Up Coffee FAQs',
						columns: [
							{ name: 'keywords', type: 'string' },
							{ name: 'is_active', type: 'boolean' },
						],
					},
				],
				'project-1',
			);

			expect(idMap.get('dt-old-1234')).toBe('dt-new');
			expect([...idMap.values()]).toEqual(['dt-new']);

			const [projectId, dto] = dataTableService.createDataTable.mock.calls[0];
			expect(projectId).toBe('project-1');
			// Original name is kept, with a unique suffix appended to dodge the
			// per-project unique-name constraint across parallel iterations.
			expect(dto.name).toMatch(/^Size Up Coffee FAQs \[seed [0-9a-f]{8}\]$/);
			expect(dto.columns).toEqual([
				{ name: 'keywords', type: 'string' },
				{ name: 'is_active', type: 'boolean' },
			]);
			// Rows are never seeded — the table is recreated empty to keep trace
			// PII out of the eval instance.
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('rejects a too-short table id without creating anything (unsafe to string-replace)', async () => {
			await expect(
				service.restoreDataTables(
					[{ id: 'short', name: 'T', columns: [{ name: 'a', type: 'string' }] }],
					'project-1',
				),
			).rejects.toThrow(BadRequestError);
			expect(dataTableService.createDataTable).not.toHaveBeenCalled();
		});

		it('rolls back already-created tables when a later table fails', async () => {
			dataTableService.createDataTable
				.mockResolvedValueOnce(mock<DataTable>({ id: 'dt-new-1' }))
				.mockRejectedValueOnce(new Error('name conflict'));

			await expect(
				service.restoreDataTables(
					[
						{ id: 'dt-old-1111', name: 'A', columns: [{ name: 'a', type: 'string' }] },
						{ id: 'dt-old-2222', name: 'B', columns: [{ name: 'b', type: 'string' }] },
					],
					'project-1',
				),
			).rejects.toThrow('name conflict');

			// The first table was created, so it must be deleted on rollback.
			expect(dataTableService.deleteDataTable).toHaveBeenCalledWith('dt-new-1', 'project-1');
		});

		it('rewrites seed data-table ids in workflow nodes to the recreated ids', async () => {
			const node = makeNode({
				type: 'n8n-nodes-base.dataTable',
				parameters: { dataTableId: { __rl: true, mode: 'id', value: 'dt-old' } },
			});

			await service.restoreWorkflows(
				[{ id: 'wf-1', name: 'wf', nodes: [node], connections: {} }],
				'project-1',
				new Map([['dt-old', 'dt-new']]),
			);

			const saved = workflowRepo.create.mock.calls[0][0];
			expect(saved.nodes?.[0]?.parameters).toEqual({
				dataTableId: { __rl: true, mode: 'id', value: 'dt-new' },
			});
		});
	});
});
