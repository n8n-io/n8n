import 'reflect-metadata';
import '../../utils/test-setup';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { expect } from 'chai';

import { Post } from './entity/Post';
import { PostReview } from './entity/PostReview';

describe('github issues > #2588 - createQueryBuilder always does left joins on relations', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('Should allow joins with conditions', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepo = connection.getRepository(Post);
				const postReviewRepo = connection.getRepository(PostReview);

				let post = new Post();
				post.title = 'My blog post';
				post = await postRepo.save(post);

				let reviews: PostReview[] = [];
				for (let i = 1; i <= 5; i++) {
					let review = new PostReview();
					review.comment = `I give it a ${i}`;
					review.rating = i;
					review.post = post;
					reviews.push(await postReviewRepo.save(review));
				}

				// Load the post
				let postFromDb = await postRepo.findOneBy({ id: post.id });
				expect(postFromDb).to.exist;
				expect(postFromDb!.reviews).lengthOf(5);

				const joinCondition = `${connection.driver.escape(
					'post_review',
				)}.${connection.driver.escape('postId')} = ${connection.driver.escape(
					'post',
				)}.${connection.driver.escape('id')} AND ${connection.driver.escape(
					'post_review',
				)}.${connection.driver.escape('rating')} >= 3`;

				postFromDb = await postRepo
					.createQueryBuilder('post')
					.where(`post.id = :postId`, { postId: post.id })
					.leftJoinAndSelect('post.reviews', 'post_review', joinCondition)
					.getOne();
				expect(postFromDb).to.exist;
				expect(postFromDb!.reviews).lengthOf(3);
			}),
		));
});
