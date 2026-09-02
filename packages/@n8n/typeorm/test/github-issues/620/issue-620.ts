import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Cat } from './entity/Cat';
import { Dog } from './entity/Dog';

describe('github issues > #620 Feature Request: Flexibility in Foreign Key names', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work as expected', () =>
		Promise.all(
			connections.map(async (connection) => {
				const dog = new Dog();
				dog.DogID = 'Simba';
				await connection.manager.save(dog);

				const cat = new Cat();
				cat.dog = dog;

				await connection.manager.save(cat);

				const loadedCat = await connection.manager
					.createQueryBuilder(Cat, 'cat')
					.leftJoinAndSelect('cat.dog', 'dog')
					.getOne();

				loadedCat!.id.should.be.equal(1);
				loadedCat!.dog.DogID.should.be.equal('Simba');
			}),
		));
});
