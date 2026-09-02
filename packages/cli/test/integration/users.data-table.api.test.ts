import { testDb, getPersonalProject } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { toTableName } from '@/modules/data-table/utils/sql-utils';

import { createDataTable } from './shared/db/data-tables';
import { createMember, createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

const testServer = utils.setupTestServer({
	endpointGroups: ['users'],
	enabledFeatures: ['feat:advancedPermissions'],
	modules: ['data-table'],
});

/** Returns true if the physical `data_table_user_<id>` table still exists in the DB. */
const physicalTableExists = async (dataTableId: string) => {
	const dataTableRepository = Container.get(DataTableRepository);
	const queryRunner = dataTableRepository.manager.connection.createQueryRunner();
	try {
		const table = await queryRunner.getTable(toTableName(dataTableId));
		return table !== undefined;
	} finally {
		await queryRunner.release();
	}
};

describe('DELETE /users/:id with data tables', () => {
	let owner: User;
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
	});

	test('should drop the physical data table when deleting a user without transfer', async () => {
		//
		// ARRANGE
		//
		const member = await createMember();
		const memberPersonalProject = await getPersonalProject(member);

		const dataTable = await createDataTable(memberPersonalProject, {
			name: 'ID Documents',
			columns: [{ name: 'document', type: 'string' }],
			data: [{ document: 'passport' }],
		});

		expect(await physicalTableExists(dataTable.id)).toBe(true);

		//
		// ACT
		//
		await ownerAgent.delete(`/users/${member.id}`).expect(200);

		//
		// ASSERT
		//
		const dataTableRepository = Container.get(DataTableRepository);

		// metadata row is gone ...
		await expect(dataTableRepository.findOneBy({ id: dataTable.id })).resolves.toBeNull();
		// ... and the physical table is dropped, not orphaned
		expect(await physicalTableExists(dataTable.id)).toBe(false);
	});

	test('should transfer the data table to the transferee project when deleting a user with transfer', async () => {
		//
		// ARRANGE
		//
		const [member, transferee] = await Promise.all([createMember(), createMember()]);
		const [memberPersonalProject, transfereePersonalProject] = await Promise.all([
			getPersonalProject(member),
			getPersonalProject(transferee),
		]);

		const dataTable = await createDataTable(memberPersonalProject, {
			name: 'Employee Onboarding',
			columns: [{ name: 'name', type: 'string' }],
			data: [{ name: 'Ada' }],
		});

		//
		// ACT
		//
		await ownerAgent
			.delete(`/users/${member.id}`)
			.query({ transferId: transfereePersonalProject.id })
			.expect(200);

		//
		// ASSERT
		//
		const dataTableRepository = Container.get(DataTableRepository);

		// data table now belongs to the transferee's personal project ...
		const transferred = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(transferred?.projectId).toBe(transfereePersonalProject.id);
		// ... and its physical table is preserved with its rows intact
		expect(await physicalTableExists(dataTable.id)).toBe(true);
	});
});
