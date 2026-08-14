import { Or, DataSource, ILike, Equal } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Person } from './entity/Person';
import { expect } from 'chai';

describe("github issues > #10054 Nested 'Or' Condition/Operation Support in Repository Where condition", () => {
	let dataSources: DataSource[];

	before(async () => {
		dataSources = await createTestingConnections({
			entities: [Person],
			enabledDrivers: ['postgres'],
			schemaCreate: true,
			dropSchema: true,
		});
	});

	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should find person where name starts with foo or equal to jane', async () => {
		await Promise.all(
			dataSources.map(async (dataSource) => {
				const foo = new Person();
				foo.name = 'Foo';
				foo.age = null;

				const john = new Person();
				john.name = 'John';
				john.age = 11;

				const dave = new Person();
				dave.name = 'Jane';
				dave.age = 12;

				const foobar = new Person();
				foobar.name = 'FooBar';
				foobar.age = 14;

				await dataSource.manager.save([foo, john, dave, foobar]);
				const persons = await dataSource.manager.find(Person, {
					where: {
						name: Or(ILike('foo%'), Equal('Jane')),
					},
				});

				expect(persons).to.have.length(3);

				expect(persons.find((user) => user.name === 'Foo')).to.be.not.undefined;

				expect(persons.find((user) => user.name === 'Jane')).to.be.not.undefined;

				expect(persons.find((user) => user.name === 'FooBar')).to.be.not.undefined;
			}),
		);
	});
});
