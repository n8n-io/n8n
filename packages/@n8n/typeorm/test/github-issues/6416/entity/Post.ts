import { EntitySchema } from '../../../../src';

import PostTag from './PostTag';
import PostAttachment from './PostAttachment';

let id = 0;

export default class Post {
	postId: number;

	otherId: number;

	tags: PostTag[];

	attachments: PostAttachment[];

	constructor() {
		this.postId = id++;
		this.otherId = id++;
	}
}

export const PostSchema = new EntitySchema<Post>({
	name: 'Post',
	target: Post,
	columns: {
		otherId: {
			type: Number,
			primary: true,
			nullable: false,
		},
		postId: {
			type: Number,
			primary: true,
			nullable: false,
		},
	},
	relations: {
		tags: {
			target: () => PostTag,
			type: 'one-to-many',
			inverseSide: 'post',
			cascade: true,
		},
		attachments: {
			target: () => PostAttachment,
			type: 'one-to-many',
			inverseSide: 'post',
			cascade: true,
		},
	},
});
