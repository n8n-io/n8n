import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/index';
import { Email, EmailChanged } from './entity/EmailChanged';
import { Change } from './entity/Change';
import { Log } from './entity/Log';

describe('github issues > #9405 Incorrect subject sorting with multi-inheritance entities', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should correctly sort entities with multi-inheritances', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const emailChanged = new EmailChanged();
				const change = new Change<Email>();
				change.propertyName = 'Example';
				emailChanged.changes = [change];

				await dataSource.getRepository(Log).save(emailChanged);
			}),
		));
});
