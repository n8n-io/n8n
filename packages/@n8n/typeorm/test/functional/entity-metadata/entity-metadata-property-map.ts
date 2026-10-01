import 'reflect-metadata';
import { Post } from './entity/Post';
import { Counters } from './entity/Counters';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Subcounters } from './entity/Subcounters';
import { User } from './entity/User';

describe('entity-metadata > property-map', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should create correct property map object', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user1 = new User();
				user1.id = 1;
				user1.name = 'Alice';

				const post1 = new Post();
				post1.title = 'About cars';
				post1.counters = new Counters();
				post1.counters.code = 1;
				post1.counters.comments = 1;
				post1.counters.favorites = 2;
				post1.counters.likes = 3;
				post1.counters.likedUsers = [user1];
				post1.counters.subcounters = new Subcounters();
				post1.counters.subcounters.version = 1;
				post1.counters.subcounters.watches = 5;
				post1.counters.subcounters.watchedUsers = [user1];

				const postPropertiesMap = connection.getMetadata(Post).propertiesMap;
				expect(
					postPropertiesMap.should.be.eql({
						id: 'id',
						title: 'title',
						counters: {
							code: 'counters.code',
							likes: 'counters.likes',
							comments: 'counters.comments',
							favorites: 'counters.favorites',
							subcounters: {
								version: 'counters.subcounters.version',
								watches: 'counters.subcounters.watches',
								watchedUsers: 'counters.subcounters.watchedUsers',
							},
							likedUsers: 'counters.likedUsers',
						},
					}),
				);
			}),
		));
});
