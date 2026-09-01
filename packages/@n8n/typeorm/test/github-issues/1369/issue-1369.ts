import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { ConcreteEntity } from './entity/ConcreteEntity';

describe('github issues > #1369 EntitySubscriber not firing events on abstract class entity', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				subscribers: [__dirname + '/subscriber/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should fire the given event for an abstract entity', () =>
		Promise.all(
			connections.map(async (connection) => {
				const entity = new ConcreteEntity();
				entity.firstname = 'Michael';
				entity.lastname = 'Scott';
				entity.position = 'Regional Manager';
				await connection.manager.save(entity);

				const foundEntity = await connection.manager.findOne(ConcreteEntity, {
					where: {
						id: 1,
					},
				});
				expect(foundEntity).to.not.be.undefined;

				const assertObject = Object.assign({}, foundEntity);
				assertObject!.should.be.eql({
					id: 1,
					firstname: 'Michael',
					lastname: 'Scott',
					fullname: 'Michael Scott',
					position: 'Regional Manager',
				});
			}),
		));
});
