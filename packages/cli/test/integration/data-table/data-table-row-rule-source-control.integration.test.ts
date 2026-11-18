import type { SourceControlledFile } from '@n8n/api-types';
import { createTeamProject } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	DataTableRepository,
	DataTableService,
	managementRowAccess,
} from '@n8n/backend-module-data-table';
import { mockDataTableSizeValidator } from '@n8n/backend-module-data-table/testing';
import { SourceControlImportService } from '@/modules/source-control.ee/source-control-import.service.ee';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

utils.setupTestServer({ endpointGroups: ['data-table'], modules: ['data-table'] });

let owner: User;
let alice: User;
let bob: User;

beforeAll(async () => {
	mockDataTableSizeValidator();
	owner = await createOwner();
	alice = await createMember();
	bob = await createMember();
});

describe('row rule after a source control pull', () => {
	test('keeps the rule on the column that held the owners before the pull renamed it', async () => {
		const service = Container.get(DataTableService);
		const project = await createTeamProject('Sales', owner);
		const table = await service.createDataTable(project.id, {
			name: 'leads',
			columns: [
				{ name: 'owner', type: 'string' },
				{ name: 'reviewer', type: 'string' },
				{ name: 'name', type: 'string' },
			],
		});
		await service.insertRows(table.id, project.id, managementRowAccess, [
			{ owner: alice.id, reviewer: bob.id, name: 'alice lead' },
			{ owner: bob.id, reviewer: alice.id, name: 'bob lead' },
		]);
		await Container.get(DataTableRepository).setRowRule(table.id, {
			conditions: [{ column: 'owner', match: 'id' }],
			projectMembersSeeAll: false,
			runsWithoutUser: 'deny',
		});

		const asBob = { kind: 'actor' as const, actor: { id: bob.id, email: null } };
		const before = await service.getManyRowsAndCount(table.id, project.id, asBob, {});
		expect(before.data.map((r) => r.name)).toEqual(['bob lead']);

		const columns = await service.getColumns(table.id, project.id);
		const byName = (name: string) => columns.find((c) => c.name === name)!;
		const dir = await mkdtemp(join(tmpdir(), 'dt-pull-'));
		const file = join(dir, `${table.id}.json`);
		await writeFile(
			file,
			JSON.stringify({
				id: table.id,
				name: 'leads',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				ownedBy: { type: 'team', teamId: project.id, teamName: project.name },
				columns: [
					{ id: byName('owner').id, name: 'assignee', type: 'string', index: 0 },
					{ id: byName('reviewer').id, name: 'owner', type: 'string', index: 1 },
					{ id: byName('name').id, name: 'name', type: 'string', index: 2 },
				],
			}),
		);

		await Container.get(SourceControlImportService).importDataTablesFromWorkFolder(
			[{ file, id: table.id, name: 'leads' } as SourceControlledFile],
			owner.id,
		);

		const after = await service.getColumns(table.id, project.id);
		expect(after.map((c) => c.name).sort()).toEqual(['assignee', 'name', 'owner']);

		const rows = await service.getManyRowsAndCount(table.id, project.id, asBob, {});
		expect(rows.data.map((r) => r.name)).toEqual(['bob lead']);
	});

	test('skips a pull that drops a rule column and keeps the table as it was', async () => {
		const service = Container.get(DataTableService);
		const project = await createTeamProject('Support', owner);
		const table = await service.createDataTable(project.id, {
			name: 'tickets',
			columns: [
				{ name: 'owner', type: 'string' },
				{ name: 'name', type: 'string' },
			],
		});
		await Container.get(DataTableRepository).setRowRule(table.id, {
			conditions: [{ column: 'owner', match: 'id' }],
			projectMembersSeeAll: false,
			runsWithoutUser: 'deny',
		});
		const columns = await service.getColumns(table.id, project.id);
		const dir = await mkdtemp(join(tmpdir(), 'dt-pull-'));
		const file = join(dir, `${table.id}.json`);
		await writeFile(
			file,
			JSON.stringify({
				id: table.id,
				name: 'tickets',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				ownedBy: { type: 'team', teamId: project.id, teamName: project.name },
				columns: [
					{
						id: columns.find((c) => c.name === 'name')!.id,
						name: 'name',
						type: 'string',
						index: 0,
					},
				],
			}),
		);

		const result = await Container.get(SourceControlImportService).importDataTablesFromWorkFolder(
			[{ file, id: table.id, name: 'tickets' } as SourceControlledFile],
			owner.id,
		);

		expect(result?.imported).not.toContain('tickets');
		const after = await service.getColumns(table.id, project.id);
		expect(after.map((c) => c.name).sort()).toEqual(['name', 'owner']);
	});
});
