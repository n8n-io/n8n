import 'reflect-metadata';
import { DataSource } from '../../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { User } from './entity/User';
import { Profile } from './entity/Profile';
import { Editor } from './entity/Editor';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { expect } from 'chai';

describe('relations > eager relations > lazy nested eager relations', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	async function prepareData(connection: DataSource) {
		const profile = new Profile();
		profile.about = 'I cut trees!';
		await connection.manager.save(profile);

		const user = new User();
		user.firstName = 'Timber';
		user.lastName = 'Saw';
		user.profile = profile;
		await connection.manager.save(user);

		const primaryCategory1 = new Category();
		primaryCategory1.name = 'primary category #1';
		await connection.manager.save(primaryCategory1);

		const primaryCategory2 = new Category();
		primaryCategory2.name = 'primary category #2';
		await connection.manager.save(primaryCategory2);

		const secondaryCategory1 = new Category();
		secondaryCategory1.name = 'secondary category #1';
		await connection.manager.save(secondaryCategory1);

		const secondaryCategory2 = new Category();
		secondaryCategory2.name = 'secondary category #2';
		await connection.manager.save(secondaryCategory2);

		const post = new Post();
		post.title = 'about eager relations';
		post.categories1 = [primaryCategory1, primaryCategory2];
		post.categories2 = [secondaryCategory1, secondaryCategory2];
		post.author = user;
		await connection.manager.save(post);

		const editor = new Editor();
		editor.post = Promise.resolve(post);
		editor.user = user;
		await connection.manager.save(editor);
	}

	it('should load all eager relations nested inside a lazy relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection);

				const loadedEditor = await connection.manager.findOne(Editor, {
					where: {
						id: 1,
					},
				});

				const loadedPost = await loadedEditor?.post;

				expect(loadedPost?.categories1).to.have.deep.members([
					{
						id: 1,
						name: 'primary category #1',
					},
					{
						id: 2,
						name: 'primary category #2',
					},
				]);

				expect(loadedPost?.categories2).to.have.deep.members([
					{
						id: 3,
						name: 'secondary category #1',
					},
					{
						id: 4,
						name: 'secondary category #2',
					},
				]);

				expect(loadedPost?.author).to.deep.equal({
					id: 1,
					firstName: 'Timber',
					lastName: 'Saw',
					profile: {
						id: 1,
						about: 'I cut trees!',
					},
				});

				expect(loadedPost?.editors).to.have.deep.members([
					{
						id: 1,
						user: {
							id: 1,
							firstName: 'Timber',
							lastName: 'Saw',
							profile: {
								id: 1,
								about: 'I cut trees!',
							},
						},
					},
				]);
			}),
		));
});
