import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
	sleep,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { User } from './entity/User';
import { Category } from './entity/Category';
import { Post } from './entity/Post';
import { Photo } from './entity/Photo';
import sinon from 'sinon';
import { FileLogger } from '../../../../src';
import { promisify } from 'util';
import fs from 'fs';
import { readFile, unlink } from 'fs';

describe('repository > find options', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user = new User();
				user.name = 'Alex Messer';
				await connection.manager.save(user);

				const category = new Category();
				category.name = 'Boys';
				await connection.manager.save(category);

				const post = new Post();
				post.title = 'About Alex Messer';
				post.author = user;
				post.categories = [category];
				await connection.manager.save(post);

				const [loadedPost] = await connection.getRepository(Post).find({
					relations: { author: true, categories: true },
				});
				expect(loadedPost).to.be.eql({
					id: 1,
					title: 'About Alex Messer',
					author: {
						id: 1,
						name: 'Alex Messer',
					},
					categories: [
						{
							id: 1,
							name: 'Boys',
						},
					],
				});
			}),
		));

	it('should execute select query inside transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user = new User();
				user.name = 'Alex Messer';
				await connection.manager.save(user);

				const queryRunner = connection.createQueryRunner();

				const startTransactionFn = sinon.spy(queryRunner, 'startTransaction');
				const commitTransactionFn = sinon.spy(queryRunner, 'commitTransaction');

				expect(startTransactionFn.called).to.be.false;
				expect(commitTransactionFn.called).to.be.false;

				await connection
					.createEntityManager(queryRunner)
					.getRepository(User)
					.findOne({
						where: {
							id: 1,
						},
						transaction: true,
					});

				expect(startTransactionFn.calledOnce).to.be.true;
				expect(commitTransactionFn.calledOnce).to.be.true;

				await queryRunner.release();
			}),
		));

	it('should select specific columns', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category = new Category();
				category.name = 'Bears';
				await connection.manager.save(category);

				const categories = [category];
				const photos = [];
				for (let i = 1; i < 10; i++) {
					const photo = new Photo();
					photo.name = `Me and Bears ${i}`;
					photo.description = `I am near bears ${i}`;
					photo.filename = `photo-with-bears-${i}.jpg`;
					photo.views = 10;
					photo.isPublished = false;
					photo.categories = categories;
					photos.push(photo);
					await connection.manager.save(photo);
				}

				const loadedPhoto = await connection.getRepository(Photo).findOne({
					select: { name: true },
					where: {
						id: 5,
					},
				});

				const loadedPhotos1 = await connection.getRepository(Photo).find({
					select: { filename: true, views: true },
				});

				const loadedPhotos2 = await connection.getRepository(Photo).find({
					select: { id: true, name: true, description: true },
					relations: { categories: true },
				});

				// const loadedPhotos3 = await connection.getRepository(Photo).createQueryBuilder("photo")
				//     .select(["photo.name", "photo.description"])
				//     .addSelect(["category.name"])
				//     .leftJoin("photo.categories", "category")
				//     .getMany();

				expect(loadedPhoto).to.be.eql({
					name: 'Me and Bears 5',
				});

				expect(loadedPhotos1).to.have.deep.members(
					photos.map((photo) => ({
						filename: photo.filename,
						views: photo.views,
					})),
				);

				expect(loadedPhotos2).to.have.deep.members(
					photos.map((photo) => ({
						id: photo.id,
						name: photo.name,
						description: photo.description,
						categories,
					})),
				);

				// expect(loadedPhotos3).to.have.deep.members(photos.map(photo => ({
				//     name: photo.name,
				//     description: photo.description,
				//     categories: categories.map(category => ({
				//         name: category.name,
				//     })),
				// })));
			}),
		));

	it('should select by given conditions', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'Bears';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'Dogs';
				await connection.manager.save(category2);

				const category3 = new Category();
				category3.name = 'Cats';
				await connection.manager.save(category3);

				const loadedCategories1 = await connection.getRepository(Category).find({
					where: {
						name: 'Bears',
					},
				});

				expect(loadedCategories1).to.be.eql([
					{
						id: 1,
						name: 'Bears',
					},
				]);

				const loadedCategories2 = await connection.getRepository(Category).find({
					where: [
						{
							name: 'Bears',
						},
						{
							name: 'Cats',
						},
					],
					order: { id: 'ASC' },
				});

				expect(loadedCategories2).to.be.eql([
					{
						id: 1,
						name: 'Bears',
					},
					{
						id: 3,
						name: 'Cats',
					},
				]);
			}),
		));
});

describe('repository > find options > comment', () => {
	let connections: DataSource[];
	const logPath = 'find_comment_test.log';

	before(async () => {
		// TODO: would be nice to be able to do this in memory with some kind of
		// test logger that buffers messages.
		const logger = new FileLogger(['query'], { logPath });
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			createLogger: () => logger,
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(async () => {
		await closeTestingConnections(connections);
		if (fs.existsSync(logPath)) {
			await promisify(unlink)(logPath);
		}
	});

	it('repository should insert comment', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.getRepository(User).find({ comment: 'This is a query comment.' });

				const logs = await promisify(readFile)(logPath);
				const lines = logs.toString().split('\n');
				const lastLine = lines[lines.length - 2]; // last line is blank after newline
				// remove timestamp and prefix
				const sql = lastLine.replace(/^.*\[QUERY\]: /, '');
				expect(sql).to.match(/^\/\* This is a query comment. \*\//);
			}),
		));
});

describe('repository > find options > cache', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				cache: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('repository should cache results properly', () =>
		Promise.all(
			connections.map(async (connection) => {
				// first prepare data - insert users
				const user1 = new User();
				user1.name = 'Harry';
				await connection.manager.save(user1);

				const user2 = new User();
				user2.name = 'Ron';
				await connection.manager.save(user2);

				const user3 = new User();
				user3.name = 'Hermione';
				await connection.manager.save(user3);

				// select for the first time with caching enabled
				const users1 = await connection.getRepository(User).find({ cache: true });

				expect(users1.length).to.be.equal(3);

				// insert new entity
				const user4 = new User();
				user4.name = 'Ginny';
				await connection.manager.save(user4);

				// without cache it must return really how many there entities are
				const users2 = await connection.getRepository(User).find();

				expect(users2.length).to.be.equal(4);

				// but with cache enabled it must not return newly inserted entity since cache is not expired yet
				const users3 = await connection.getRepository(User).find({ cache: true });
				expect(users3.length).to.be.equal(3);

				// give some time for cache to expire
				await sleep(1000);

				// now, when our cache has expired we check if we have new user inserted even with cache enabled
				const users4 = await connection.getRepository(User).find({ cache: true });
				expect(users4.length).to.be.equal(4);
			}),
		));
});
