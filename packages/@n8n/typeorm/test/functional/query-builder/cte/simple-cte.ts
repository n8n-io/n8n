import 'reflect-metadata';
import { expect } from 'chai';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Foo } from './entity/foo';
import { filterByCteCapabilities } from './helpers';
import { DataSource } from '../../../../src/index.js';

describe('query builder > cte > simple', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('show allow select from CTE', () =>
		Promise.all(
			dataSources.filter(filterByCteCapabilities('enabled')).map(async (dataSource) => {
				await dataSource
					.getRepository(Foo)
					.insert([1, 2, 3].map((i) => ({ id: i, bar: String(i) })));

				let cteSelection = 'foo.bar';

				const cteQuery = dataSource
					.createQueryBuilder()
					.select()
					.addSelect(cteSelection, 'bar')
					.from(Foo, 'foo')
					.where(`${cteSelection} = :value`, { value: '2' });

				const cteOptions = {
					columnNames: ['raz'],
				};

				cteSelection = 'qaz.raz';

				const qb = dataSource
					.createQueryBuilder()
					.addCommonTableExpression(cteQuery, 'qaz', cteOptions)
					.from('qaz', 'qaz')
					.select([])
					.addSelect(cteSelection, 'raz');

				expect(await qb.getRawMany()).to.deep.equal([{ raz: '2' }]);
			}),
		));

	it('should allow join with CTE', () =>
		Promise.all(
			dataSources.filter(filterByCteCapabilities('enabled')).map(async (dataSource) => {
				await dataSource
					.getRepository(Foo)
					.insert([1, 2, 3].map((i) => ({ id: i, bar: String(i) })));

				let cteSelection = 'foo.bar';

				const cteQuery = dataSource
					.createQueryBuilder()
					.select()
					.addSelect('bar', 'bar')
					.from(Foo, 'foo')
					.where(`${cteSelection} = '2'`);

				const cteOptions = {
					columnNames: ['raz'],
				};

				cteSelection = 'qaz.raz';

				const results = await dataSource
					.createQueryBuilder(Foo, 'foo')
					.addCommonTableExpression(cteQuery, 'qaz', cteOptions)
					.innerJoin('qaz', 'qaz', `${cteSelection} = foo.bar`)
					.getMany();

				expect(results).to.have.length(1);

				expect(results[0]).to.include({
					bar: '2',
				});
			}),
		));

	it('should allow to use INSERT with RETURNING clause in CTE', () =>
		Promise.all(
			dataSources.filter(filterByCteCapabilities('writable')).map(async (connection) => {
				const bar = Math.random().toString();
				const cteQuery = connection
					.createQueryBuilder()
					.insert()
					.into(Foo)
					.values({
						id: 7,
						bar,
					})
					.returning(['id', 'bar']);

				const results = await connection
					.createQueryBuilder()
					.select()
					.addCommonTableExpression(cteQuery, 'insert_result')
					.from('insert_result', 'insert_result')
					.getRawMany();

				expect(results).to.have.length(1);

				expect(results[0]).to.include({
					bar,
				});
			}),
		));

	it('should allow string for CTE', () =>
		Promise.all(
			dataSources.filter(filterByCteCapabilities('enabled')).map(async (dataSource) => {
				let results: { row: any }[];

				results = await dataSource
					.createQueryBuilder()
					.select()
					.addCommonTableExpression(
						`
                                SELECT 1
                                UNION
                                SELECT 2
                                `,
						'cte',
						{ columnNames: ['foo'] },
					)
					.from('cte', 'cte')
					.addSelect('foo', 'row')
					.getRawMany<{ row: any }>();

				const [rowWithOne, rowWithTwo] = results;

				expect(String(rowWithOne.row)).to.equal('1');
				expect(String(rowWithTwo.row)).to.equal('2');
			}),
		));
});
