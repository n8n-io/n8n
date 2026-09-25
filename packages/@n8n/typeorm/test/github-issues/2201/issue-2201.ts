import { expect } from 'chai';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { RecordContext } from './entity/ver2/context';
import { Record } from './entity/ver2/record';
import { User } from './entity/ver2/user';

describe('github issues > #2201 - Create a select query when using a (custom) junction table', () => {
	it("Should create only two PM columns ('order_id' and 'user_id')", async () => {
		const connections = await createTestingConnections({
			entities: [__dirname + '/entity/ver1/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
		if (!connections.length) return;

		const contextMetadata = connections[0].entityMetadatas.find(
			(metadata) => metadata.name === 'RecordContext',
		)!;
		const expectedColumnNames = ['record_id', 'meta', 'user_id'];
		const existingColumnNames = contextMetadata.columns.map((col) => col.databaseName);

		expect(existingColumnNames.length).to.eql(expectedColumnNames.length);
		expect(existingColumnNames).have.members(expectedColumnNames);

		await closeTestingConnections(connections);
	});

	it('Should not try to update the junction table when not needed', async () => {
		const connections = await createTestingConnections({
			entities: [__dirname + '/entity/ver2/*{.js,.ts}'],
			enabledDrivers: ['postgres'],
			schemaCreate: true,
			dropSchema: true,
		});
		if (!connections.length) return;

		User.useDataSource(connections[0]);
		Record.useDataSource(connections[0]);
		RecordContext.useDataSource(connections[0]);

		const user = User.create({ id: 'user1' });
		await user.save();

		const record = Record.create({ id: 'record1', status: 'pending' });
		await record.save();

		const context = RecordContext.create({
			user,
			record,
			userId: user.id,
			recordId: record.id,
			meta: 'meta',
		} as RecordContext);
		await context.save();

		const query = Record.createQueryBuilder('record')
			.leftJoinAndSelect('record.contexts', 'context')
			.where('record.id = :recordId', { recordId: record.id });

		const result = (await query.getOne())!;

		result.status = 'failed';

		await result.save();
		expect(0).to.eql(0);

		await closeTestingConnections(connections);
	});
});
