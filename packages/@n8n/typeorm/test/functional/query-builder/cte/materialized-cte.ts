import 'reflect-metadata';
import { expect } from 'chai';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Connection } from '../../../../src/connection/Connection';
import { Foo } from './entity/foo';
import { filterByCteCapabilities } from './helpers';
import { QueryBuilderCteOptions } from '../../../../src/query-builder/QueryBuilderCte';

describe('query builder > cte > materialized', () => {
	let connections: Connection[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				// enabledDrivers: [']
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should allow MATERIALIZED hint', () =>
		Promise.all(
			connections
				.filter(filterByCteCapabilities('enabled'))
				.filter(filterByCteCapabilities('materializedHint'))
				.map(async (connection) => {
					await connection
						.getRepository(Foo)
						.insert([1, 2, 3].map((i) => ({ id: i, bar: String(i) })));
					const cteQuery = connection
						.createQueryBuilder()
						.select()
						.addSelect(`foo.bar`, 'bar')
						.from(Foo, 'foo')
						.where(`foo.bar = :value`, { value: '2' });

					const cteOptions: QueryBuilderCteOptions = {
						columnNames: ['raz'],
						materialized: true,
					};

					const cteSelection = 'qaz.raz';

					const qb = await connection
						.createQueryBuilder()
						.addCommonTableExpression(cteQuery, 'qaz', cteOptions)
						.from('qaz', 'qaz')
						.select([])
						.addSelect(cteSelection, 'raz');

					expect(qb.getQuery()).to.contain(`WITH "qaz"("raz") AS MATERIALIZED (`);
					expect(await qb.getRawMany()).to.deep.equal([{ raz: '2' }]);
				}),
		));

	it('should allow NOT MATERIALIZED hint', () =>
		Promise.all(
			connections
				.filter(filterByCteCapabilities('enabled'))
				.filter(filterByCteCapabilities('materializedHint'))
				.map(async (connection) => {
					await connection
						.getRepository(Foo)
						.insert([1, 2, 3].map((i) => ({ id: i, bar: String(i) })));
					const cteQuery = connection
						.createQueryBuilder()
						.select()
						.addSelect(`foo.bar`, 'bar')
						.from(Foo, 'foo')
						.where(`foo.bar = :value`, { value: '2' });

					const cteOptions: QueryBuilderCteOptions = {
						columnNames: ['raz'],
						materialized: false,
					};

					const cteSelection = 'qaz.raz';

					const qb = await connection
						.createQueryBuilder()
						.addCommonTableExpression(cteQuery, 'qaz', cteOptions)
						.from('qaz', 'qaz')
						.select([])
						.addSelect(cteSelection, 'raz');

					expect(qb.getQuery()).to.contain(`WITH "qaz"("raz") AS NOT MATERIALIZED (`);
					expect(await qb.getRawMany()).to.deep.equal([{ raz: '2' }]);
				}),
		));

	it('should omit hint if materialized option is not set', () =>
		Promise.all(
			connections
				.filter(filterByCteCapabilities('enabled'))
				.filter(filterByCteCapabilities('materializedHint'))
				.map(async (connection) => {
					await connection
						.getRepository(Foo)
						.insert([1, 2, 3].map((i) => ({ id: i, bar: String(i) })));
					const cteQuery = connection
						.createQueryBuilder()
						.select()
						.addSelect(`foo.bar`, 'bar')
						.from(Foo, 'foo')
						.where(`foo.bar = :value`, { value: '2' });

					const cteOptions: QueryBuilderCteOptions = {
						columnNames: ['raz'],
					};

					const cteSelection = 'qaz.raz';

					const qb = await connection
						.createQueryBuilder()
						.addCommonTableExpression(cteQuery, 'qaz', cteOptions)
						.from('qaz', 'qaz')
						.select([])
						.addSelect(cteSelection, 'raz');

					expect(qb.getQuery()).to.contain(`WITH "qaz"("raz") AS (`);
					expect(await qb.getRawMany()).to.deep.equal([{ raz: '2' }]);
				}),
		));
});
