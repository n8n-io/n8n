import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { expect } from 'chai';

describe('transaction > nested transaction', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				disabledDrivers: ['sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should execute operations based on conditions in deeply nested scenario', () =>
		Promise.all(
			connections.map(async (connection) => {
				const conditions: {
					id: number;
					title: string;
					shouldExist: boolean;
				}[] = [];

				await connection.manager.transaction(async (em0) => {
					const post = new Post();
					post.title = 'Post #1';
					await em0.save(post);
					conditions.push({ ...post, shouldExist: true });

					try {
						await em0.transaction(async (em1) => {
							const post = new Post();
							post.title = 'Post #2';
							await em1.save(post);
							conditions.push({ ...post, shouldExist: false });

							await em1.transaction(async (em2) => {
								const post = new Post();
								post.title = 'Post #3';
								await em2.save(post);
								conditions.push({ ...post, shouldExist: false });
							});
							throw new Error('');
						});
					} catch (_) {}

					await em0.transaction(async (em1) => {
						const post = new Post();
						post.title = 'Post #4';
						await em1.save(post);
						conditions.push({ ...post, shouldExist: true });
					});

					await em0.transaction(async (em1) => {
						const post = new Post();
						post.title = 'Post #5';
						await em1.save(post);
						conditions.push({ ...post, shouldExist: true });

						try {
							await em1.transaction(async (em2) => {
								const post = new Post();
								post.title = 'Post #6';
								await em2.save(post);
								conditions.push({ ...post, shouldExist: false });

								await em2.transaction(async (em3) => {
									const post = new Post();
									post.title = 'Post #7';
									await em3.save(post);
									conditions.push({
										...post,
										shouldExist: false,
									});
								});
								throw new Error('');
							});
						} catch (_) {}

						await em1.transaction(async (em2) => {
							const post = new Post();
							post.title = 'Post #8';
							await em2.save(post);
							conditions.push({ ...post, shouldExist: true });
						});

						await em1.transaction(async (em2) => {
							const post = new Post();
							post.title = 'Post #9';
							await em2.save(post);
							conditions.push({ ...post, shouldExist: true });

							try {
								await em2.transaction(async (em3) => {
									const post = new Post();
									post.title = 'Post #10';
									await em3.save(post);
									conditions.push({
										...post,
										shouldExist: false,
									});

									await em3.transaction(async (em4) => {
										const post = new Post();
										post.title = 'Post #11';
										await em4.save(post);
										conditions.push({
											...post,
											shouldExist: false,
										});
									});
									throw new Error('');
								});
							} catch (_) {}

							await em2.transaction(async (em3) => {
								const post = new Post();
								post.title = 'Post #12';
								await em3.save(post);
								conditions.push({ ...post, shouldExist: true });
							});
						});
					});
				});

				for (const condition of conditions) {
					const post = await connection.manager.findOne(Post, {
						where: { title: condition.title },
					});
					if (condition.shouldExist) {
						expect(post).not.to.be.null;
						post!.should.be.eql({
							id: condition.id,
							title: condition.title,
						});
					} else {
						expect(post).to.be.null;
					}
				}
			}),
		));

	it('should fail operations when first transaction fails', () =>
		Promise.all(
			connections.map(async (connection) => {
				const conditions: { id: number; title: string }[] = [];

				try {
					await connection.manager.transaction(async (em0) => {
						const post = new Post();
						post.title = 'Post #1';
						await em0.save(post);
						conditions.push({ ...post });

						try {
							await em0.transaction(async (em1) => {
								const post = new Post();
								post.title = 'Post #2';
								await em1.save(post);
								conditions.push({ ...post });
								throw new Error('');
							});
						} catch (_) {}

						await em0.transaction(async (em1) => {
							const post = new Post();
							post.title = 'Post #3';
							await em1.save(post);
							conditions.push({ ...post });

							try {
								await em1.transaction(async (em2) => {
									const post = new Post();
									post.title = 'Post #4';
									await em2.save(post);
									conditions.push({ ...post });
									throw new Error('');
								});
							} catch (_) {}

							await em1.transaction(async (em2) => {
								const post = new Post();
								post.title = 'Post #5';
								await em2.save(post);
								conditions.push({ ...post });

								try {
									await em2.transaction(async (em3) => {
										const post = new Post();
										post.title = 'Post #6';
										await em3.save(post);
										conditions.push({ ...post });
										throw new Error('');
									});
								} catch (_) {}
							});
						});
						throw new Error('');
					});
				} catch (_) {}

				for (const condition of conditions) {
					const post = await connection.manager.findOne(Post, {
						where: { title: condition.title },
					});
					expect(post).to.be.null;
				}
			}),
		));
});
