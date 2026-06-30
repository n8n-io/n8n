import { expect } from 'chai';
import { DataSource, DeepPartial, Repository } from '../../../src';
import '../../utils/test-setup';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Item } from './entity/item.entity';
import { Thing } from './entity/thing.entity';

describe('github issues > #8681 DeepPartial simplification breaks the .create() and .save() method in certain cases.', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should .save() and .create() complex deep partial entities', () =>
		Promise.all(
			connections.map(async (connection) => {
				const myThing: DeepPartial<Thing> = {
					items: [{ id: 1 }, { id: 2 }],
				};

				const thing = connection.manager.create(Thing, myThing);
				await connection.getRepository(Thing).save(myThing);

				const items = connection.manager.create(Item, myThing.items);
				if (myThing.items) await connection.getRepository(Item).save(myThing.items);

				const dbItems = await connection.manager.find(Item);
				expect(dbItems).to.have.length(2);

				return { thing, items };
			}),
		));
	it('should .save() and .create() complex deep partial entities using a generic repository', () =>
		Promise.all(
			connections.map(async (connection) => {
				class AbstractService<T extends object> {
					private repository: Repository<T>;
					constructor(target: any) {
						this.repository = new Repository(target, connection.manager);
					}
					create(data: DeepPartial<T>): Promise<T> {
						const entity = this.repository.create(data);
						return this.repository.save(entity);
					}
				}

				const thingService = new AbstractService<Thing>(Thing);

				const myThing: DeepPartial<Thing> = { id: 1 };
				const thing = await thingService.create(myThing);

				const thingRepository = connection.getRepository(Thing);
				const dbItems = await thingRepository.find();
				expect(dbItems).to.have.length(1);

				return { thing };
			}),
		));
});
