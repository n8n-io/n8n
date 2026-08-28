import '../../utils/test-setup';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { expect } from 'chai';
import { Record } from './entity/Record';

describe('github issues > #1314 UPDATE on json column stores string type', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'], // because only postgres supports jsonb type
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not store json type as string on update', () =>
		Promise.all(
			connections.map(async (connection) => {
				let recordRepo = connection.getRepository(Record);

				let record = new Record();
				record.data = { foo: 'bar' };

				let persistedRecord = await recordRepo.save(record);
				record.data.should.be.eql({ foo: 'bar' });

				let foundRecord = await recordRepo.findOne({
					where: {
						id: persistedRecord.id,
					},
				});
				expect(foundRecord).to.be.not.undefined;
				expect(foundRecord!.data.foo).to.eq('bar');

				// Update
				foundRecord!.data = { answer: 42 };
				await recordRepo.save(foundRecord!);
				foundRecord = await recordRepo.findOne({
					where: {
						id: persistedRecord.id,
					},
				});

				expect(foundRecord).to.be.not.undefined;
				expect(foundRecord!.data).to.not.be.equal('{"answer":42}');
				expect(foundRecord!.data.answer).to.eq(42);
			}),
		));
});
