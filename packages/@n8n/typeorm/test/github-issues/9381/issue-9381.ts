import 'reflect-metadata';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { In, JsonContains, Not } from '../../../src';
import { ExampleEntity } from './entity/ExampleEntity';
import { expect } from 'chai';
import { JsonExampleEntity } from './entity/JsonExampleEntity';

describe('github issues > #9381 The column option 《transformer》 affects the result of the query condition generation', () => {
	it('transform and find values', async () => {
		const dataSources = await createTestingConnections({
			entities: [__dirname + '/entity/ExampleEntity{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});

		await Promise.all(
			dataSources.map(async (dataSource) => {
				let repository = dataSource.getRepository(ExampleEntity);
				await repository.save(new ExampleEntity());
				await repository.save(new ExampleEntity());
				await repository.save(new ExampleEntity());
				await repository.save(new ExampleEntity());
				await repository.save(new ExampleEntity());
				const resultFindAll = await repository.find();
				expect(resultFindAll.length).to.be.eql(5);

				const resultTransformer = await repository.findBy({
					id: Not(In(['1', '3', '5'])),
				});
				expect(resultTransformer).to.be.eql([
					{
						id: '2',
					},
					{
						id: '4',
					},
				]);
				const findEqualsTransformer = await repository.findOne({
					where: {
						id: '1',
					},
				});
				expect(findEqualsTransformer).to.be.eql({ id: '1' });
			}),
		);

		await closeTestingConnections(dataSources);
	});

	it('transform json values and find values', async () => {
		const dataSources = await createTestingConnections({
			entities: [__dirname + '/entity/JsonExampleEntity{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
			enabledDrivers: ['postgres'],
		});

		await Promise.all(
			dataSources.map(async (dataSource) => {
				let repository = dataSource.getRepository(JsonExampleEntity);
				await repository.save(new JsonExampleEntity({ foo: 'bar1' }));
				await repository.save(new JsonExampleEntity({ foo: 'bar2' }));
				await repository.save(new JsonExampleEntity({ foo: 'bar3' }));
				await repository.save(new JsonExampleEntity({ foo: 'bar4' }));
				await repository.save(new JsonExampleEntity({ foo: 'bar5' }));
				await repository.save(new JsonExampleEntity({ foo: { bar: [5, 6, 7, 8] } }));
				await repository.save(new JsonExampleEntity([5, 6, 7, 8]));

				const resultTransformer = await repository.findBy({
					id: Not(In(['1', '3', '5', '6', '7'])),
				});
				expect(resultTransformer).to.be.eql([
					{
						id: '2',
						jsonvalue: {
							foo: 'bar2',
						},
					},
					{
						id: '4',
						jsonvalue: {
							foo: 'bar4',
						},
					},
				]);

				let result = await repository.findOneBy({
					jsonvalue: JsonContains({ foo: 'bar1' }),
				});
				expect(result).to.be.eql({
					id: '1',
					jsonvalue: {
						foo: 'bar1',
					},
				});

				result = await repository.findOneBy({
					jsonvalue: JsonContains({ foo: {} }),
				});
				expect(result).to.be.eql({
					id: '6',
					jsonvalue: {
						foo: { bar: [5, 6, 7, 8] },
					},
				});

				result = await repository.findOneBy({
					jsonvalue: JsonContains([5, 6, 7, 8] as any),
				});
				expect(result).to.be.eql({
					id: '7',
					jsonvalue: [5, 6, 7, 8],
				});
			}),
		);
		await closeTestingConnections(dataSources);
	});
	// you can add additional tests if needed
});
