import '../../utils/test-setup';
import { expect } from 'chai';
import { Record } from './entity/Record';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { RecordData } from './entity/RecordData';

describe('github issues > #204 jsonb array is not persisted correctly', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Record],
				enabledDrivers: ['postgres'], // because only postgres supports jsonb type
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should persist json and jsonb arrays correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const record = new Record();
				record.datas = [
					new RecordData('hello1', 'hello2', 'hello3', 'hello4', true, false),
					new RecordData('hi1', 'hi2', 'hi3', 'hi4', false, true),
					new RecordData('bye1', 'bye2', 'bye3', 'bye4', false, false),
				];
				record.configs = [
					{
						id: 1,
						option1: '1',
						option2: '1',
						option3: '1',
						isActive: true,
						extra: { data1: 'one', data2: 'two' },
					},
					{
						id: 2,
						option1: '2',
						option2: '2',
						option3: '2',
						isActive: false,
						extra: { data1: 'one', data2: 'two' },
					},
					{
						id: 3,
						option1: '3',
						option2: '3',
						option3: '3',
						isActive: true,
						extra: { data1: 'one', data2: 'two' },
					},
				];
				await connection.manager.save(record);

				const foundRecord = await connection.manager.findOneBy(Record, {
					id: record.id,
				});
				expect(foundRecord).to.be.not.undefined;
				foundRecord!.datas.should.be.eql([
					new RecordData('hello1', 'hello2', 'hello3', 'hello4', true, false),
					new RecordData('hi1', 'hi2', 'hi3', 'hi4', false, true),
					new RecordData('bye1', 'bye2', 'bye3', 'bye4', false, false),
				]);
				foundRecord!.configs.should.be.eql([
					{
						id: 1,
						option1: '1',
						option2: '1',
						option3: '1',
						isActive: true,
						extra: { data1: 'one', data2: 'two' },
					},
					{
						id: 2,
						option1: '2',
						option2: '2',
						option3: '2',
						isActive: false,
						extra: { data1: 'one', data2: 'two' },
					},
					{
						id: 3,
						option1: '3',
						option2: '3',
						option3: '3',
						isActive: true,
						extra: { data1: 'one', data2: 'two' },
					},
				]);
			}),
		));
});
