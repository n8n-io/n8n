import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';

import { Photo } from './entity/Photo';
import { User } from './entity/User';
import { Profile } from './entity/Profile';
import { Category } from './entity/Category';
import { Question } from './entity/Question';

describe('github issues > #4190 Relation decorators: allow to pass string instead of typeFunction', () => {
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

	it('should work with one-to-one relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				const profile = new Profile();
				profile.gender = 'male';
				profile.photo = 'me.jpg';
				await connection.manager.save(profile);

				const user = new User();
				user.name = 'Joe Smith';
				user.profile = profile;
				await connection.manager.save(user);

				const users = await connection.manager.find(User, {
					relations: { profile: true },
				});

				users.should.eql([
					{
						id: 1,
						name: 'Joe Smith',
						profile: {
							id: 1,
							gender: 'male',
							photo: 'me.jpg',
						},
					},
				]);
			}),
		));

	it('should work with many-to-one/one-to-many relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				const photo1 = new Photo();
				photo1.url = 'me.jpg';
				await connection.manager.save(photo1);

				const photo2 = new Photo();
				photo2.url = 'me-and-bears.jpg';
				await connection.manager.save(photo2);

				const user = new User();
				user.name = 'John';
				user.photos = [photo1, photo2];
				await connection.manager.save(user);

				const users = await connection.manager.find(User, {
					relations: { photos: true },
				});
				const photos = await connection.manager.find(Photo, {
					relations: { user: true },
				});

				// Check one-to-many
				users[0].photos.should.have.deep.members([
					{
						id: 1,
						url: 'me.jpg',
					},
					{
						id: 2,
						url: 'me-and-bears.jpg',
					},
				]);

				// Check many-to-one
				photos.should.have.deep.members([
					{
						id: 1,
						url: 'me.jpg',
						user: {
							id: 1,
							name: 'John',
						},
					},
					{
						id: 2,
						url: 'me-and-bears.jpg',
						user: {
							id: 1,
							name: 'John',
						},
					},
				]);
			}),
		));

	it('should work with many-to-many relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'animals';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'zoo';
				await connection.manager.save(category2);

				const question = new Question();
				question.name = 'About animals';
				question.categories = [category1, category2];
				await connection.manager.save(question);

				const questions = await connection.manager.find(Question, {
					relations: { categories: true },
				});

				questions[0].categories.should.have.deep.members([
					{
						id: 1,
						name: 'animals',
					},
					{
						id: 2,
						name: 'zoo',
					},
				]);
			}),
		));
});
