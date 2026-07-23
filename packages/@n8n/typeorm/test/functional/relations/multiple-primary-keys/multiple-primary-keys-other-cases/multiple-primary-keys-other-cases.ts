import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { User } from './entity/User';
import { EventMember } from './entity/EventMember';
import { Event } from './entity/Event';
import { Person } from './entity/Person';

describe('relations > multiple-primary-keys > other-cases', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load related entity when entity uses relation ids as primary id', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user1 = new User();
				user1.name = 'Alice';
				await connection.manager.save(user1);

				const user2 = new User();
				user2.name = 'Bob';
				await connection.manager.save(user2);

				const user3 = new User();
				user3.name = 'Clara';
				await connection.manager.save(user3);

				const person1 = new Person();
				person1.fullName = 'Alice A';
				person1.user = user1;
				await connection.manager.save(person1);

				const person2 = new Person();
				person2.fullName = 'Bob B';
				person2.user = user2;
				await connection.manager.save(person2);

				const event1 = new Event();
				event1.name = 'Event #1';
				event1.author = person1;
				await connection.manager.save(event1);

				const event2 = new Event();
				event2.name = 'Event #2';
				event2.author = person2;
				await connection.manager.save(event2);

				const eventMember1 = new EventMember();
				eventMember1.user = user1;
				eventMember1.event = event1;
				await connection.manager.save(eventMember1);

				const eventMember2 = new EventMember();
				eventMember2.user = user2;
				eventMember2.event = event1;
				await connection.manager.save(eventMember2);

				const eventMember3 = new EventMember();
				eventMember3.user = user1;
				eventMember3.event = event2;
				await connection.manager.save(eventMember3);

				const eventMember4 = new EventMember();
				eventMember4.user = user3;
				eventMember4.event = event2;
				await connection.manager.save(eventMember4);

				const loadedEvents = await connection.manager
					.createQueryBuilder(Event, 'event')
					.leftJoinAndSelect('event.author', 'author')
					.leftJoinAndSelect('author.user', 'authorUser')
					.leftJoinAndSelect('event.members', 'members')
					.leftJoinAndSelect('members.user', 'user')
					.orderBy('event.id, user.id')
					.getMany();

				expect(loadedEvents[0].author).to.not.be.undefined;
				expect(loadedEvents[0].author.fullName).to.be.equal('Alice A');
				expect(loadedEvents[0].author.user).to.not.be.undefined;
				expect(loadedEvents[0].author.user.id).to.be.equal(1);
				expect(loadedEvents[0].members).to.not.be.eql([]);
				expect(loadedEvents[0].members[0].user.id).to.be.equal(1);
				expect(loadedEvents[0].members[0].user.name).to.be.equal('Alice');
				expect(loadedEvents[0].members[1].user.id).to.be.equal(2);
				expect(loadedEvents[0].members[1].user.name).to.be.equal('Bob');
				expect(loadedEvents[1].author).to.not.be.undefined;
				expect(loadedEvents[1].author.fullName).to.be.equal('Bob B');
				expect(loadedEvents[1].author.user).to.not.be.undefined;
				expect(loadedEvents[1].author.user.id).to.be.equal(2);
				expect(loadedEvents[1].members).to.not.be.eql([]);
				expect(loadedEvents[1].members[0].user.id).to.be.equal(1);
				expect(loadedEvents[1].members[0].user.name).to.be.equal('Alice');
				expect(loadedEvents[1].members[1].user.id).to.be.equal(3);
				expect(loadedEvents[1].members[1].user.name).to.be.equal('Clara');

				const loadedUsers = await connection.manager
					.createQueryBuilder(User, 'user')
					.leftJoinAndSelect('user.members', 'members')
					.leftJoinAndSelect('members.event', 'event')
					.orderBy('user.id, event.id')
					.getMany();

				expect(loadedUsers[0].members).to.not.be.eql([]);
				expect(loadedUsers[0].members[0].event.id).to.be.equal(1);
				expect(loadedUsers[0].members[0].event.name).to.be.equal('Event #1');
				expect(loadedUsers[0].members[1].event.id).to.be.equal(2);
				expect(loadedUsers[0].members[1].event.name).to.be.equal('Event #2');
				expect(loadedUsers[1].members).to.not.be.eql([]);
				expect(loadedUsers[1].members[0].event.id).to.be.equal(1);
				expect(loadedUsers[1].members[0].event.name).to.be.equal('Event #1');
				expect(loadedUsers[2].members).to.not.be.eql([]);
				expect(loadedUsers[2].members[0].event.id).to.be.equal(2);
				expect(loadedUsers[2].members[0].event.name).to.be.equal('Event #2');
			}),
		));
});
