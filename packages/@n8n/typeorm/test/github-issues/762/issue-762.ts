import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Foo } from './entity/Foo';
import { FooMetadata } from './entity/FooMetadata';
import { FooChildMetadata } from './entity/FooChildMetadata';

describe('github issues > #762 Nullable @Embedded inside @Embedded', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work perfectly with all data set', () =>
		Promise.all(
			connections.map(async (connection) => {
				const foo = new Foo();
				foo.name = 'Apple';
				foo.metadata = new FooMetadata();
				foo.metadata.bar = 1;
				foo.metadata.child = new FooChildMetadata();
				foo.metadata.child.something = 2;
				foo.metadata.child.somethingElse = 3;
				await connection.manager.save(foo);

				const loadedFoo = await connection.getRepository(Foo).findOneBy({ name: 'Apple' });
				loadedFoo!.should.be.eql({
					id: 1,
					name: 'Apple',
					metadata: {
						bar: 1,
						child: {
							something: 2,
							somethingElse: 3,
						},
					},
				});
			}),
		));

	it('should work perfectly with some data not set', () =>
		Promise.all(
			connections.map(async (connection) => {
				const foo = new Foo();
				foo.name = 'Apple';
				foo.metadata = new FooMetadata();
				foo.metadata.bar = 1;
				foo.metadata.child = new FooChildMetadata();
				foo.metadata.child.somethingElse = 3;
				await connection.manager.save(foo);

				const loadedFoo = await connection.getRepository(Foo).findOneBy({ name: 'Apple' });
				loadedFoo!.should.be.eql({
					id: 1,
					name: 'Apple',
					metadata: {
						bar: 1,
						child: {
							something: null,
							somethingElse: 3,
						},
					},
				});

				const foo2 = new Foo();
				foo2.name = 'Apple2';
				foo2.metadata = new FooMetadata();
				foo2.metadata.child = new FooChildMetadata();
				foo2.metadata.child.something = 2;
				await connection.manager.save(foo2);

				const loadedFoo2 = await connection.getRepository(Foo).findOneBy({ name: 'Apple2' });
				loadedFoo2!.should.be.eql({
					id: 2,
					name: 'Apple2',
					metadata: {
						bar: null,
						child: {
							something: 2,
							somethingElse: null,
						},
					},
				});

				const foo3 = new Foo();
				foo3.name = 'Apple3';
				foo3.metadata = new FooMetadata();
				await connection.manager.save(foo3);

				const loadedFoo3 = await connection.getRepository(Foo).findOneBy({ name: 'Apple3' });
				loadedFoo3!.should.be.eql({
					id: 3,
					name: 'Apple3',
					metadata: {
						bar: null,
						child: {
							something: null,
							somethingElse: null,
						},
					},
				});
			}),
		));

	it('should work perfectly without any data set', () =>
		Promise.all(
			connections.map(async (connection) => {
				const foo = new Foo();
				foo.name = 'Orange';
				await connection.manager.save(foo);

				const loadedFoo = await connection.getRepository(Foo).findOneBy({ name: 'Orange' });
				loadedFoo!.should.be.eql({
					id: 1,
					name: 'Orange',
					metadata: {
						bar: null,
						child: {
							something: null,
							somethingElse: null,
						},
					},
				});
			}),
		));
});
