import 'reflect-metadata';
import { Post } from './entity/Post';
import { Image } from './entity/Image';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { expect } from 'chai';
import { DataSource } from '../../../../../src/data-source/DataSource';

describe('query builder > relational with many > add and remove many to many inverse', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should add entity relation of a given entity by entity objects', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.url = 'image #1';
				await connection.manager.save(image1);

				const image2 = new Image();
				image2.url = 'image #2';
				await connection.manager.save(image2);

				const image3 = new Image();
				image3.url = 'image #3';
				await connection.manager.save(image3);

				const post1 = new Post();
				post1.title = 'post #1';
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'post #2';
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.title = 'post #3';
				await connection.manager.save(post3);

				await connection.createQueryBuilder().relation(Image, 'posts').of(image1).add(post1);

				let loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { images: true },
				});
				expect(loadedPost1!.images).to.deep.include({
					id: 1,
					url: 'image #1',
				});

				let loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { images: true },
				});
				expect(loadedPost2!.images).to.be.eql([]);

				let loadedPost3 = await connection.manager.findOne(Post, {
					where: { id: 3 },
					relations: { images: true },
				});
				expect(loadedPost3!.images).to.be.eql([]);

				await connection.createQueryBuilder().relation(Image, 'posts').of(image1).remove(post1);

				loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { images: true },
				});
				expect(loadedPost1!.images).to.not.contain({
					id: 1,
					url: 'image #1',
				});

				loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { images: true },
				});
				expect(loadedPost2!.images).to.be.eql([]);

				loadedPost3 = await connection.manager.findOne(Post, {
					where: { id: 3 },
					relations: { images: true },
				});
				expect(loadedPost3!.images).to.be.eql([]);
			}),
		));

	it('should add entity relation of a given entity by entity id', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.url = 'image #1';
				await connection.manager.save(image1);

				const image2 = new Image();
				image2.url = 'image #2';
				await connection.manager.save(image2);

				const image3 = new Image();
				image3.url = 'image #3';
				await connection.manager.save(image3);

				const post1 = new Post();
				post1.title = 'post #1';
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'post #2';
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.title = 'post #3';
				await connection.manager.save(post3);

				await connection
					.createQueryBuilder()
					.relation(Image, 'posts')
					.of(2) // image id
					.add(2); // post id

				let loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { images: true },
				});
				expect(loadedPost1!.images).to.be.eql([]);

				let loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { images: true },
				});
				expect(loadedPost2!.images).to.deep.include({
					id: 2,
					url: 'image #2',
				});

				let loadedPost3 = await connection.manager.findOne(Post, {
					where: { id: 3 },
					relations: { images: true },
				});
				expect(loadedPost3!.images).to.be.eql([]);

				await connection
					.createQueryBuilder()
					.relation(Image, 'posts')
					.of(2) // image id
					.remove(2); // post id

				loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { images: true },
				});
				expect(loadedPost1!.images).to.be.eql([]);

				loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { images: true },
				});
				expect(loadedPost2!.images).to.not.contain({
					id: 2,
					url: 'image #2',
				});

				loadedPost3 = await connection.manager.findOne(Post, {
					where: { id: 3 },
					relations: { images: true },
				});
				expect(loadedPost3!.images).to.be.eql([]);
			}),
		));

	it('should add entity relation of a given entity by entity id map', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.url = 'image #1';
				await connection.manager.save(image1);

				const image2 = new Image();
				image2.url = 'image #2';
				await connection.manager.save(image2);

				const image3 = new Image();
				image3.url = 'image #3';
				await connection.manager.save(image3);

				const post1 = new Post();
				post1.title = 'post #1';
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'post #2';
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.title = 'post #3';
				await connection.manager.save(post3);

				await connection
					.createQueryBuilder()
					.relation(Image, 'posts')
					.of({ id: 3 }) // image id
					.add({ id: 3 }); // post id

				let loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { images: true },
				});
				expect(loadedPost1!.images).to.be.eql([]);

				let loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { images: true },
				});
				expect(loadedPost2!.images).to.be.eql([]);

				let loadedPost3 = await connection.manager.findOne(Post, {
					where: { id: 3 },
					relations: { images: true },
				});
				expect(loadedPost3!.images).to.deep.include({
					id: 3,
					url: 'image #3',
				});

				await connection
					.createQueryBuilder()
					.relation(Image, 'posts')
					.of({ id: 3 }) // image id
					.remove({ id: 3 }); // post id

				loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { images: true },
				});
				expect(loadedPost1!.images).to.be.eql([]);

				loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { images: true },
				});
				expect(loadedPost2!.images).to.be.eql([]);

				loadedPost3 = await connection.manager.findOne(Post, {
					where: { id: 3 },
					relations: { images: true },
				});
				expect(loadedPost3!.images).to.not.contain({
					id: 3,
					url: 'image #3',
				});
			}),
		));

	it('should add entity relation of a multiple entities', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.url = 'image #1';
				await connection.manager.save(image1);

				const image2 = new Image();
				image2.url = 'image #2';
				await connection.manager.save(image2);

				const image3 = new Image();
				image3.url = 'image #3';
				await connection.manager.save(image3);

				const post1 = new Post();
				post1.title = 'post #1';
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'post #2';
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.title = 'post #3';
				await connection.manager.save(post3);

				await connection
					.createQueryBuilder()
					.relation(Image, 'posts')
					.of([{ id: 1 }, { id: 3 }]) // images
					.add({ id: 3 }); // post

				let loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { images: true },
				});
				expect(loadedPost1!.images).to.be.eql([]);

				let loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { images: true },
				});
				expect(loadedPost2!.images).to.be.eql([]);

				let loadedPost3 = await connection.manager.findOne(Post, {
					where: { id: 3 },
					relations: { images: true },
				});
				expect(loadedPost3!.images).to.deep.include({
					id: 1,
					url: 'image #1',
				});
				expect(loadedPost3!.images).to.deep.include({
					id: 3,
					url: 'image #3',
				});

				await connection
					.createQueryBuilder()
					.relation(Image, 'posts')
					.of([{ id: 1 }, { id: 3 }]) // images
					.remove({ id: 3 }); // post

				loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { images: true },
				});
				expect(loadedPost1!.images).to.be.eql([]);

				loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { images: true },
				});
				expect(loadedPost2!.images).to.be.eql([]);

				loadedPost3 = await connection.manager.findOne(Post, {
					where: { id: 3 },
					relations: { images: true },
				});
				expect(loadedPost3!.images).to.not.contain({
					id: 1,
					url: 'image #1',
				});
				expect(loadedPost3!.images).to.not.contain({
					id: 3,
					url: 'image #3',
				});
			}),
		));

	it('should add multiple entities into relation of a multiple entities', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.url = 'image #1';
				await connection.manager.save(image1);

				const image2 = new Image();
				image2.url = 'image #2';
				await connection.manager.save(image2);

				const image3 = new Image();
				image3.url = 'image #3';
				await connection.manager.save(image3);

				const post1 = new Post();
				post1.title = 'post #1';
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'post #2';
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.title = 'post #3';
				await connection.manager.save(post3);

				await connection
					.createQueryBuilder()
					.relation(Image, 'posts')
					.of({ id: 3 }) // image
					.add([{ id: 1 }, { id: 3 }]); // posts

				let loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { images: true },
				});
				expect(loadedPost1!.images).to.deep.include({
					id: 3,
					url: 'image #3',
				});

				let loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { images: true },
				});
				expect(loadedPost2!.images).to.be.eql([]);

				let loadedPost3 = await connection.manager.findOne(Post, {
					where: { id: 3 },
					relations: { images: true },
				});
				expect(loadedPost3!.images).to.deep.include({
					id: 3,
					url: 'image #3',
				});

				await connection
					.createQueryBuilder()
					.relation(Image, 'posts')
					.of({ id: 3 }) // image
					.remove([{ id: 1 }, { id: 3 }]); // posts

				loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { images: true },
				});
				expect(loadedPost1!.images).to.not.contain({
					id: 3,
					url: 'image #3',
				});

				loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { images: true },
				});
				expect(loadedPost2!.images).to.be.eql([]);

				loadedPost3 = await connection.manager.findOne(Post, {
					where: { id: 3 },
					relations: { images: true },
				});
				expect(loadedPost3!.images).to.not.contain({
					id: 3,
					url: 'image #3',
				});
			}),
		));
});
