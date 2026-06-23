import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { createUser } from '@test-integration/db/users';

import {
	validateDataTableReferencesForUpdate,
	validateDataTableReferencesForWorkflow,
} from '../tools/workflow-builder/data-table-validation';

import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { DataTableService } from '@/modules/data-table/data-table.service';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn']);
});

afterAll(async () => {
	await testDb.terminate();
});

const dataTableNode = (
	name: string,
	dataTableId: { __rl: true; mode: 'id' | 'name' | 'list'; value: string },
): INode => ({
	id: name,
	name,
	type: 'n8n-nodes-base.dataTable',
	typeVersion: 1,
	position: [0, 0],
	parameters: { dataTableId },
});

describe('data-table validation against a real database', () => {
	let user: User;
	let project: Project;
	let dataTableOps: ReturnType<DataTableProxyService['makeDataTableOperationsForUser']>;
	let dataTableService: DataTableService;

	beforeAll(() => {
		dataTableService = Container.get(DataTableService);
	});

	beforeEach(async () => {
		user = await createUser({ role: GLOBAL_OWNER_ROLE });
		project = await createTeamProject(undefined, user);
		dataTableOps = Container.get(DataTableProxyService).makeDataTableOperationsForUser(user);
	});

	describe('validateDataTableReferencesForWorkflow', () => {
		it('passes when no node references a data table', async () => {
			const nodes: INode[] = [
				{
					id: 'a',
					name: 'A',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			];

			const result = await validateDataTableReferencesForWorkflow(nodes, project.id, dataTableOps);

			expect(result).toEqual({ ok: true });
		});

		it('passes when the referenced data table exists in the project (id lookup)', async () => {
			const created = await dataTableService.createDataTable(project.id, {
				name: 'orders',
				columns: [{ name: 'sku', type: 'string' }],
			});

			const result = await validateDataTableReferencesForWorkflow(
				[dataTableNode('DT', { __rl: true, mode: 'id', value: created.id })],
				project.id,
				dataTableOps,
			);

			expect(result).toEqual({ ok: true });
		});

		it('passes when the referenced data table exists (name lookup)', async () => {
			await dataTableService.createDataTable(project.id, {
				name: 'customers',
				columns: [{ name: 'email', type: 'string' }],
			});

			const result = await validateDataTableReferencesForWorkflow(
				[dataTableNode('DT', { __rl: true, mode: 'name', value: 'customers' })],
				project.id,
				dataTableOps,
			);

			expect(result).toEqual({ ok: true });
		});

		it('fails with a guidance message when the referenced id does not exist', async () => {
			const result = await validateDataTableReferencesForWorkflow(
				[dataTableNode('DT', { __rl: true, mode: 'id', value: 'this-id-was-never-created' })],
				project.id,
				dataTableOps,
			);

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error).toContain("node 'DT'");
			expect(result.error).toContain("data table with id 'this-id-was-never-created' not found");
			expect(result.error).toContain('create_data_table');
			expect(result.error).toContain('search_data_tables');
		});

		it('fails when the referenced name does not exist in the project', async () => {
			await dataTableService.createDataTable(project.id, {
				name: 'orders',
				columns: [{ name: 'sku', type: 'string' }],
			});

			const result = await validateDataTableReferencesForWorkflow(
				[dataTableNode('DT', { __rl: true, mode: 'name', value: 'wrong-name' })],
				project.id,
				dataTableOps,
			);

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error).toContain("data table with name 'wrong-name' not found");
		});

		it('fails when the table exists but lives in a different project', async () => {
			const otherProject = await createTeamProject(undefined, user);
			const created = await dataTableService.createDataTable(otherProject.id, {
				name: 'orders',
				columns: [{ name: 'sku', type: 'string' }],
			});

			const result = await validateDataTableReferencesForWorkflow(
				[dataTableNode('DT', { __rl: true, mode: 'id', value: created.id })],
				project.id,
				dataTableOps,
			);

			expect(result.ok).toBe(false);
		});

		it('skips validation for expression values', async () => {
			const result = await validateDataTableReferencesForWorkflow(
				[dataTableNode('DT', { __rl: true, mode: 'id', value: '={{ $json.tableId }}' })],
				project.id,
				dataTableOps,
			);

			expect(result).toEqual({ ok: true });
		});

		it('reports the first failing node when multiple nodes reference missing tables', async () => {
			const created = await dataTableService.createDataTable(project.id, {
				name: 'orders',
				columns: [{ name: 'sku', type: 'string' }],
			});

			const result = await validateDataTableReferencesForWorkflow(
				[
					dataTableNode('OK', { __rl: true, mode: 'id', value: created.id }),
					dataTableNode('BadFirst', { __rl: true, mode: 'id', value: 'gone-1' }),
					dataTableNode('BadSecond', { __rl: true, mode: 'id', value: 'gone-2' }),
				],
				project.id,
				dataTableOps,
			);

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error).toContain("node 'BadFirst'");
			expect(result.error).not.toContain("node 'BadSecond'");
		});
	});

	describe('validateDataTableReferencesForUpdate', () => {
		it('attributes the failure to the touching opIndex', async () => {
			const touched = new Map<string, number>([['DT', 3]]);

			const result = await validateDataTableReferencesForUpdate(
				[dataTableNode('DT', { __rl: true, mode: 'id', value: 'never-existed' })],
				touched,
				project.id,
				dataTableOps,
			);

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.opIndex).toBe(3);
			expect(result.error).toContain('Operation 3 failed');
			expect(result.error).toContain("node 'DT'");
		});

		it('skips lookups for nodes outside the touched set', async () => {
			const result = await validateDataTableReferencesForUpdate(
				[dataTableNode('UntouchedDT', { __rl: true, mode: 'id', value: 'irrelevant' })],
				new Map([['SomeOtherNode', 0]]),
				project.id,
				dataTableOps,
			);

			expect(result).toEqual({ ok: true });
		});

		it('passes when all touched references resolve in the project', async () => {
			const t1 = await dataTableService.createDataTable(project.id, {
				name: 't1',
				columns: [{ name: 'a', type: 'string' }],
			});
			const t2 = await dataTableService.createDataTable(project.id, {
				name: 't2',
				columns: [{ name: 'a', type: 'string' }],
			});

			const result = await validateDataTableReferencesForUpdate(
				[
					dataTableNode('A', { __rl: true, mode: 'id', value: t1.id }),
					dataTableNode('B', { __rl: true, mode: 'id', value: t2.id }),
				],
				new Map([
					['A', 0],
					['B', 1],
				]),
				project.id,
				dataTableOps,
			);

			expect(result).toEqual({ ok: true });
		});
	});
});
