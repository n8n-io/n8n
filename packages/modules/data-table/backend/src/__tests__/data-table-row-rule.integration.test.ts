import type { DataTableRowRule } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataTableRowRuleService } from '../data-table-row-rule.service';
import { DataTableRepository } from '../data-table.repository';
import { DataTableService } from '../data-table.service';
import { managementRowAccess, type RowAccess } from '../data-table.types';
import { DataTableRowAccessError } from '../errors/data-table-row-access.error';
import { DataTableValidationError } from '../errors/data-table-validation.error';
import { mockDataTableSizeValidator } from '../testing';

beforeAll(async () => {
	await testModules.loadModules(['data-table'], {
		'data-table': async () => await import('../data-table.module.js'),
	});
	await testDb.init();
	mockDataTableSizeValidator();
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn']);
});

afterAll(async () => {
	await testDb.terminate();
});

const alice: RowAccess = { kind: 'actor', actor: { id: 'alice-id', email: 'alice@example.com' } };
const bob: RowAccess = { kind: 'actor', actor: { id: 'bob-id', email: 'bob@example.com' } };
const noUser: RowAccess = { kind: 'actor', actor: null };

describe('data table row rule', () => {
	let service: DataTableService;
	let project: Project;
	let tableId: string;

	const setRule = async (rule: DataTableRowRule | null) =>
		await Container.get(DataTableRepository).setRowRule(tableId, rule);

	const names = async (
		access: RowAccess,
		filter?: Parameters<typeof service.getManyRowsAndCount>[3]['filter'],
	) => {
		const { data } = await service.getManyRowsAndCount(tableId, project.id, access, { filter });
		return data.map((row) => row.name).sort();
	};

	beforeAll(() => {
		service = Container.get(DataTableService);
	});

	beforeEach(async () => {
		project = await createTeamProject();
		const table = await service.createDataTable(project.id, {
			name: 'leads',
			columns: [
				{ name: 'owner', type: 'string' },
				{ name: 'name', type: 'string' },
			],
		});
		tableId = table.id;
		await service.insertRows(tableId, project.id, managementRowAccess, [
			{ owner: 'alice-id', name: 'a1' },
			{ owner: 'alice-id', name: 'a2' },
			{ owner: 'bob-id', name: 'b1' },
			{ owner: null, name: 'nobody' },
		]);
	});

	afterEach(async () => {
		await service.deleteDataTableAll();
	});

	it('gives every row to an actor when the table has no rule', async () => {
		expect(await names(alice)).toEqual(['a1', 'a2', 'b1', 'nobody']);
	});

	describe('with a rule that matches by id', () => {
		beforeEach(async () => {
			await setRule({ column: 'owner', match: 'id', runsWithoutUser: 'deny' });
		});

		it('returns only the rows of the actor', async () => {
			expect(await names(alice)).toEqual(['a1', 'a2']);
			expect(await names(bob)).toEqual(['b1']);
		});

		it('keeps every row for management access', async () => {
			expect(await names(managementRowAccess)).toEqual(['a1', 'a2', 'b1', 'nobody']);
		});

		it('keeps an "or" filter inside the rows of the actor', async () => {
			const filter = {
				type: 'or' as const,
				filters: [
					{ columnName: 'name', condition: 'eq' as const, value: 'b1' },
					{ columnName: 'name', condition: 'eq' as const, value: 'a1' },
				],
			};

			expect(await names(alice, filter)).toEqual(['a1']);
			expect(await names(managementRowAccess, filter)).toEqual(['a1', 'b1']);
		});

		it('counts only the rows of the actor', async () => {
			const { count } = await service.getManyRowsAndCount(tableId, project.id, bob, {});
			expect(count).toBe(1);
		});

		it('sets the owner column on insert', async () => {
			const [row] = await service.insertRows(tableId, project.id, bob, [{ name: 'b2' }], 'all');

			expect(row).toMatchObject({ owner: 'bob-id', name: 'b2' });
		});

		it('refuses an insert with a different owner', async () => {
			await expect(
				service.insertRows(tableId, project.id, bob, [{ owner: 'alice-id', name: 'x' }]),
			).rejects.toThrow(DataTableRowAccessError);
		});

		it('updates only the rows of the actor', async () => {
			const updated = await service.updateRows(
				tableId,
				project.id,
				bob,
				{
					filter: { type: 'or', filters: [{ columnName: 'name', condition: 'neq', value: 'x' }] },
					data: { name: 'changed' },
				},
				true,
			);

			expect(updated.map((row) => row.name)).toEqual(['changed']);
			expect(await names(alice)).toEqual(['a1', 'a2']);
		});

		it('refuses an update that changes the owner', async () => {
			await expect(
				service.updateRows(tableId, project.id, alice, {
					filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'a1' }] },
					data: { owner: 'bob-id' },
				}),
			).rejects.toThrow(DataTableRowAccessError);
		});

		it('upserts into the rows of the actor', async () => {
			await service.upsertRow(tableId, project.id, bob, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'a1' }] },
				data: { name: 'a1' },
			});

			expect(await names(alice)).toEqual(['a1', 'a2']);
			expect(await names(bob)).toEqual(['a1', 'b1']);
		});

		it('deletes only the rows of the actor', async () => {
			await service.deleteRows(tableId, project.id, bob, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'neq', value: 'x' }] },
			});

			expect(await names(managementRowAccess)).toEqual(['a1', 'a2', 'nobody']);
		});

		it('clears only the rows of the actor', async () => {
			const { deletedCount } = await service.clearRows(tableId, project.id, alice);

			expect(deletedCount).toBe(2);
			expect(await names(managementRowAccess)).toEqual(['b1', 'nobody']);
		});

		it('refuses a run without a user', async () => {
			await expect(names(noUser)).rejects.toThrow(DataTableRowAccessError);
		});

		it('gives every row to a run without a user when the rule allows it', async () => {
			await setRule({ column: 'owner', match: 'id', runsWithoutUser: 'allRows' });

			expect(await names(noUser)).toEqual(['a1', 'a2', 'b1', 'nobody']);
			expect(await names(alice)).toEqual(['a1', 'a2']);
		});
	});

	describe('with a rule that matches by email', () => {
		beforeEach(async () => {
			await setRule({ column: 'owner', match: 'email', runsWithoutUser: 'deny' });
			await service.insertRows(tableId, project.id, managementRowAccess, [
				{ owner: 'alice@example.com', name: 'a-mail' },
			]);
		});

		it('returns the rows that carry the email of the actor', async () => {
			expect(await names(alice)).toEqual(['a-mail']);
		});

		it('refuses an actor without an email', async () => {
			await expect(
				names({ kind: 'actor', actor: { id: 'alice-id', email: null } }),
			).rejects.toThrow(DataTableRowAccessError);
		});
	});

	describe('setting the rule', () => {
		const rule: DataTableRowRule = { column: 'owner', match: 'id', runsWithoutUser: 'deny' };

		it('applies a rule on a text column', async () => {
			await Container.get(DataTableRowRuleService).setRowRule(tableId, project.id, rule);

			expect(await names(bob)).toEqual(['b1']);
		});

		it('refuses an unknown column', async () => {
			await expect(
				Container.get(DataTableRowRuleService).setRowRule(tableId, project.id, {
					...rule,
					column: 'missing',
				}),
			).rejects.toThrow(DataTableValidationError);
		});

		it('refuses a column that is not text', async () => {
			await service.addColumn(tableId, project.id, { name: 'score', type: 'number' });

			await expect(
				Container.get(DataTableRowRuleService).setRowRule(tableId, project.id, {
					...rule,
					column: 'score',
				}),
			).rejects.toThrow(DataTableValidationError);
		});

		it('removes the rule', async () => {
			await setRule(rule);
			await Container.get(DataTableRowRuleService).setRowRule(tableId, project.id, null);

			expect(await names(bob)).toEqual(['a1', 'a2', 'b1', 'nobody']);
		});
	});

	describe('rule column changes', () => {
		beforeEach(async () => {
			await setRule({ column: 'owner', match: 'id', runsWithoutUser: 'deny' });
		});

		it('refuses to delete the rule column', async () => {
			const columns = await service.getColumns(tableId, project.id);
			const owner = columns.find((column) => column.name === 'owner')!;

			await expect(service.deleteColumn(tableId, project.id, owner.id)).rejects.toThrow(
				DataTableValidationError,
			);
		});

		it('moves the rule to the renamed column', async () => {
			const columns = await service.getColumns(tableId, project.id);
			const owner = columns.find((column) => column.name === 'owner')!;

			await service.renameColumn(tableId, project.id, owner.id, { name: 'assignee' });

			expect(await names(bob)).toEqual(['b1']);
		});
	});
});
