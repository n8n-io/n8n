import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	createTestingConnections,
	reloadTestingDatabases,
	closeTestingConnections,
} from '../../utils/test-utils';
import { Dummy } from './entity/Dummy';
import { WrappedString } from './wrapped-string';
import { MemoryLogger } from './memory-logger';

describe('github issues > #2703 Column with transformer is not normalized for update', () => {
	let connections: DataSource[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [`${__dirname}/entity/*{.js,.ts}`],
				schemaCreate: true,
				dropSchema: true,
				createLogger: () => new MemoryLogger(false),
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));
	afterEach(() =>
		connections.forEach((connection) => {
			const logger = connection.logger as MemoryLogger;
			logger.enabled = false;
			logger.clear();
		}),
	);

	it('should transform values when computing changed columns', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repository = connection.getRepository(Dummy);

				const dummy = repository.create({
					value: new WrappedString('test'),
				});
				await repository.save(dummy);

				const logger = connection.logger as MemoryLogger;
				logger.enabled = true;

				await repository.save(dummy);

				const updateQueries = logger.queries.filter((q) => q.startsWith('UPDATE'));

				expect(updateQueries).to.be.empty;
			}),
		));
});
