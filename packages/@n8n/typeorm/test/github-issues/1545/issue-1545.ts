import 'reflect-metadata';
import '../../utils/test-setup';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	createTestingConnections,
	reloadTestingDatabases,
	closeTestingConnections,
} from '../../utils/test-utils';
import { ValidationModel } from './entity/ValidationModel';
import { MainModel } from './entity/MainModel';
import { DataModel } from './entity/DataModel';

// TODO: this test was broken after removing primary: true from relation decorators
//  due to complexity of cascades, it was skipped fow now
describe.skip('github issues > #1545 Typeorm runs insert query instead of update query on save of existing entity for ManyToOne relationships', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should add intial validation data', () =>
		Promise.all(
			connections.map(async (connection) => {
				const validation1 = new ValidationModel();
				validation1.validation = 123;

				const validation2 = new ValidationModel();
				validation2.validation = 456;

				await connection.manager.save(validation1);
				await connection.manager.save(validation2);

				const data1_1 = new DataModel();
				data1_1.active = true;
				data1_1.validations = validation1;

				const main1 = new MainModel();
				main1.dataModel = [data1_1];

				await connection.manager.save(main1);

				// console.dir(main1, { colors: true, depth: null });

				main1.dataModel[0].active = false;
				await connection.manager.save(main1);
				// console.dir(main1, { colors: true, depth: null });

				return true;
			}),
		));
});
