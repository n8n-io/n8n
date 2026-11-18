import type { DataTableFilter, DataTableRowRule } from '@n8n/api-types';
import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, type Person, type Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataTableRepository } from '../data-table.repository';
import { DataTableService } from '../data-table.service';
import { managementRowAccess, type RowAccess } from '../data-table.types';
import { mockDataTableSizeValidator } from '../testing';
import { createUser } from './fixtures/users';

beforeAll(async () => {
	await testModules.loadModules(['data-table'], {
		'data-table': async () => await import('../data-table.module.js'),
	});
	await testDb.init();
	mockDataTableSizeValidator();
});

afterAll(async () => {
	await testDb.terminate();
});

const asActor = (user: Person): RowAccess => ({
	kind: 'actor',
	actor: { id: user.id, email: user.email },
});

const f = (
	filters: DataTableFilter['filters'],
	type: DataTableFilter['type'] = 'and',
): DataTableFilter => ({ type, filters });

describe('row rule edge cases', () => {
	let service: DataTableService;
	let project: Project;
	let teamA: Project;
	let teamB: Project;
	let tableId: string;
	let alice: Person;
	let bob: Person;
	let chatUser: Person;
	let viewer: Person;

	const setRule = async (rule: DataTableRowRule | null) =>
		await Container.get(DataTableRepository).setRowRule(tableId, rule);

	const ownerRule: DataTableRowRule = {
		conditions: [{ column: 'owner', match: 'id' }],
		projectMembersSeeAll: false,
		runsWithoutUser: 'deny',
	};
	const mixedRule: DataTableRowRule = {
		conditions: [
			{ column: 'owner', match: 'id' },
			{ column: 'team', match: 'project' },
		],
		projectMembersSeeAll: false,
		runsWithoutUser: 'deny',
	};
	const teamOnlyRule: DataTableRowRule = {
		conditions: [{ column: 'team', match: 'project' }],
		projectMembersSeeAll: false,
		runsWithoutUser: 'deny',
	};

	const list = async (
		access: RowAccess,
		dto: Parameters<DataTableService['getManyRowsAndCount']>[3] = {},
	) => await service.getManyRowsAndCount(tableId, project.id, access, dto);
	const names = async (
		access: RowAccess,
		dto: Parameters<DataTableService['getManyRowsAndCount']>[3] = {},
	) => (await list(access, dto)).data.map((row) => row.name as string).sort();
	const allRows = async () =>
		(await list(managementRowAccess)).data.map((row) => ({
			name: row.name,
			owner: row.owner,
			team: row.team,
			note: row.note,
		}));

	beforeAll(() => {
		service = Container.get(DataTableService);
	});

	beforeEach(async () => {
		await testDb.truncate(['DataTable', 'DataTableColumn']);
		project = await createTeamProject();
		teamA = await createTeamProject();
		teamB = await createTeamProject();
		alice = await createUser();
		bob = await createUser();
		chatUser = await createUser();
		viewer = await createUser();
		await linkUserToProject(alice, teamA, 'project:editor');
		await linkUserToProject(bob, teamB, 'project:editor');
		await linkUserToProject(chatUser, project, 'project:chatUser');
		await linkUserToProject(viewer, project, 'project:viewer');

		const table = await service.createDataTable(project.id, {
			name: `leads-${Math.random()}`,
			columns: [
				{ name: 'owner', type: 'string' },
				{ name: 'team', type: 'string' },
				{ name: 'name', type: 'string' },
				{ name: 'note', type: 'string' },
			],
		});
		tableId = table.id;
		await service.insertRows(tableId, project.id, managementRowAccess, [
			{ owner: alice.id, team: null, name: 'a1', note: 'secret-a' },
			{ owner: alice.id, team: teamA.id, name: 'a2', note: 'secret-a' },
			{ owner: bob.id, team: null, name: 'b1', note: 'secret-b' },
			{ owner: null, team: null, name: 'nobody', note: 'secret-n' },
			{ owner: '', team: '', name: 'empty', note: 'secret-e' },
			{ owner: 'someone', team: teamA.id, name: 'teamA row', note: 'secret-t' },
		]);
	});

	afterEach(async () => {
		await service.deleteDataTableAll();
	});

	describe('reads under an owner rule', () => {
		beforeEach(async () => await setRule(ownerRule));

		it('keeps rows of other owners hidden with an or filter on the owner column', async () => {
			const filter = f(
				[
					{ columnName: 'owner', condition: 'neq', value: bob.id },
					{ columnName: 'owner', condition: 'isEmpty', value: null },
					{ columnName: 'owner', condition: 'eq', value: alice.id },
				],
				'or',
			);
			expect(await names(asActor(bob), { filter })).toEqual([]);
		});

		it('keeps rows hidden with like and ilike wildcards', async () => {
			for (const condition of ['like', 'ilike'] as const) {
				const filter = f([{ columnName: 'owner', condition, value: '%' }]);
				expect(await names(asActor(bob), { filter })).toEqual(['b1']);
			}
		});

		it('keeps rows hidden with a wildcard search', async () => {
			expect(await names(asActor(bob), { search: '%' })).toEqual(['b1']);
			expect(await names(asActor(bob), { search: 'secret' })).toEqual(['b1']);
			expect(await names(asActor(bob), { search: alice.id })).toEqual([]);
		});

		it('counts only the rows of the actor with paging and sorting', async () => {
			const result = await list(asActor(bob), {
				skip: 0,
				take: 1,
				sortBy: ['owner', 'DESC'],
				filter: f([{ columnName: 'id', condition: 'gt', value: 0 }]),
			});
			expect(result.count).toBe(1);
			expect(result.data.map((r) => r.name)).toEqual(['b1']);
			const page2 = await list(asActor(bob), { skip: 1, take: 10 });
			expect(page2.data).toEqual([]);
			expect(page2.count).toBe(1);
		});

		it('keeps rows hidden with a long or filter list', async () => {
			const filters = Array.from({ length: 60 }, (_, i) => ({
				columnName: 'id',
				condition: 'eq' as const,
				value: i,
			}));
			expect(await names(asActor(bob), { filter: f(filters, 'or') })).toEqual(['b1']);
		});
	});

	describe('writes under an owner rule', () => {
		beforeEach(async () => await setRule(ownerRule));

		const everyRow = f([{ columnName: 'id', condition: 'gt', value: 0 }]);

		it('changes and returns only rows of the actor on update with returnData', async () => {
			const updated = await service.updateRows(
				tableId,
				project.id,
				asActor(bob),
				{ filter: everyRow, data: { note: 'overwritten' } },
				true,
			);
			expect(updated.map((r) => r.name)).toEqual(['b1']);
			const notes = (await allRows()).filter((r) => r.note === 'overwritten').map((r) => r.name);
			expect(notes).toEqual(['b1']);
		});

		it('previews only rows of the actor in an update dry run', async () => {
			const preview = await service.updateRows(
				tableId,
				project.id,
				asActor(bob),
				{ filter: everyRow, data: { note: 'x' } },
				true,
				true,
			);
			expect([...new Set(preview.map((r) => r.name))].filter(Boolean)).toEqual(
				['b1', 'x'].filter((n) => n === 'b1'),
			);
		});

		it('deletes and returns only rows of the actor', async () => {
			const preview = await service.deleteRows(
				tableId,
				project.id,
				asActor(bob),
				{ filter: everyRow },
				true,
				true,
			);
			expect(preview.filter((r) => r.dryRunState === 'before').map((r) => r.name)).toEqual(['b1']);

			const deleted = await service.deleteRows(
				tableId,
				project.id,
				asActor(bob),
				{ filter: everyRow },
				true,
			);
			expect(deleted.map((r) => r.name)).toEqual(['b1']);
			expect((await allRows()).map((r) => r.name).sort()).toEqual([
				'a1',
				'a2',
				'empty',
				'nobody',
				'teamA row',
			]);
		});

		it('clears only rows of the actor', async () => {
			const { deletedCount } = await service.clearRows(tableId, project.id, asActor(bob));
			expect(deletedCount).toBe(1);
			expect((await allRows()).length).toBe(5);
		});

		it('inserts a new row instead of changing a hidden row on upsert', async () => {
			const result = await service.upsertRow(
				tableId,
				project.id,
				asActor(bob),
				{
					filter: f([{ columnName: 'name', condition: 'eq', value: 'a1' }]),
					data: { note: 'hijack' },
				},
				true,
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({ owner: bob.id, note: 'hijack' });
			expect((await allRows()).find((r) => r.name === 'a1')).toMatchObject({
				owner: alice.id,
				note: 'secret-a',
			});
		});

		it('reveals no hidden row in an upsert dry run', async () => {
			const preview = await service.upsertRow(
				tableId,
				project.id,
				asActor(bob),
				{
					filter: f([{ columnName: 'name', condition: 'eq', value: 'a1' }]),
					data: { name: 'a1' },
				},
				true,
				true,
			);
			expect(JSON.stringify(preview)).not.toContain('secret-a');
			expect(JSON.stringify(preview)).not.toContain(alice.id);
		});

		it('stamps the actor as owner for forged owner values', async () => {
			const forged = [alice.id.toUpperCase(), ` ${alice.id}`, `${bob.id} `, '', 12345];
			for (const owner of forged) {
				try {
					await service.insertRows(tableId, project.id, asActor(bob), [
						{ owner: owner as string, name: `forged-${String(owner)}` },
					]);
				} catch {
					// a refusal is fine too
				}
			}
			const forgedRows = (await allRows()).filter((r) => String(r.name).startsWith('forged-'));
			for (const row of forgedRows) expect(row.owner).toBe(bob.id);
		});

		it('refuses to give a row of the actor to someone else', async () => {
			await expect(
				service.updateRows(tableId, project.id, asActor(bob), {
					filter: f([{ columnName: 'name', condition: 'eq', value: 'b1' }]),
					data: { owner: alice.id },
				}),
			).rejects.toThrow();
			await expect(
				service.updateRows(tableId, project.id, asActor(bob), {
					filter: f([{ columnName: 'name', condition: 'eq', value: 'b1' }]),
					data: { owner: alice.id.toUpperCase() },
				}),
			).rejects.toThrow();
		});

		it('refuses every row operation for a run without a user under deny', async () => {
			const noUser: RowAccess = { kind: 'actor', actor: null };
			await expect(list(noUser)).rejects.toThrow();
			await expect(
				service.insertRows(tableId, project.id, noUser, [{ name: 'x' }]),
			).rejects.toThrow();
			await expect(service.clearRows(tableId, project.id, noUser)).rejects.toThrow();
			await expect(
				service.deleteRows(tableId, project.id, noUser, { filter: everyRow }),
			).rejects.toThrow();
			expect((await allRows()).length).toBe(6);
		});

		it('keeps the rule on the renamed column when another column takes its old name', async () => {
			const columns = await service.getColumns(tableId, project.id);
			const ownerCol = columns.find((c) => c.name === 'owner')!;
			const noteCol = columns.find((c) => c.name === 'note')!;
			await service.renameColumn(tableId, project.id, ownerCol.id, { name: 'assignee' });
			await service.renameColumn(tableId, project.id, noteCol.id, { name: 'owner' });

			expect(await names(asActor(bob))).toEqual(['b1']);
		});
	});

	describe('team rule', () => {
		it('keeps a teammate row with its owner when the actor claims it', async () => {
			await setRule(mixedRule);
			const updated = await service.updateRows(
				tableId,
				project.id,
				asActor(alice),
				{
					filter: f([{ columnName: 'name', condition: 'eq', value: 'teamA row' }]),
					data: { owner: alice.id },
				},
				true,
			);
			expect(updated).toEqual([]);
			expect((await allRows()).find((r) => r.name === 'teamA row')).toMatchObject({
				owner: 'someone',
			});
		});

		it('refuses a team of another project on upsert insert', async () => {
			await setRule(teamOnlyRule);
			await expect(
				service.upsertRow(tableId, project.id, asActor(alice), {
					filter: f([{ columnName: 'name', condition: 'eq', value: 'nothing' }]),
					data: { name: 'new', team: teamB.id },
				}),
			).rejects.toThrow();
			await expect(
				service.insertRows(tableId, project.id, asActor(alice), [
					{ name: 'arr', team: [teamB.id] as unknown as string },
				]),
			).rejects.toThrow();
		});

		it('hides team rows after the actor leaves the team', async () => {
			await setRule(teamOnlyRule);
			expect(await names(asActor(alice))).toEqual(['a2', 'teamA row']);
			await Container.get(ProjectRelationRepository).delete({
				userId: alice.id,
				projectId: teamA.id,
			});
			expect(await names(asActor(alice))).toEqual([]);
			await expect(
				service.insertRows(tableId, project.id, asActor(alice), [{ name: 'late', team: teamA.id }]),
			).rejects.toThrow();
		});

		it('refuses an empty team value under a team-only rule', async () => {
			await setRule(teamOnlyRule);
			await expect(
				service.updateRows(tableId, project.id, asActor(alice), {
					filter: f([{ columnName: 'name', condition: 'eq', value: 'a2' }]),
					data: { team: '' },
				}),
			).rejects.toThrow();
		});

		it('gives a project chat user only the own rows when members see all rows', async () => {
			await setRule({ ...ownerRule, projectMembersSeeAll: true });
			// A chat user has no row scope on the project, so the member exception should not apply.
			expect(await names(asActor(chatUser))).toEqual([]);
		});

		it('keeps rows of others when a project chat user clears the table and members see all rows', async () => {
			await setRule({ ...ownerRule, projectMembersSeeAll: true });
			await service.clearRows(tableId, project.id, asActor(chatUser));
			expect((await allRows()).length).toBe(6);
		});
	});
});
