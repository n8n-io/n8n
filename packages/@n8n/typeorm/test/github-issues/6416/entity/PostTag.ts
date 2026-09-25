import { EntitySchema } from '../../../../src';

import Post from './Post';

let id = 0;

export default class PostTag {
	postId: number;
	tagId: number;

	tagOtherId: string;

	tagPostId: string;

	post: Post;

	constructor() {
		this.tagId = id++;
	}
}

export const PostTagSchema = new EntitySchema<PostTag>({
	name: 'PostTag',
	target: PostTag,
	columns: {
		tagOtherId: {
			type: Number,
			primary: true,
		},
		tagPostId: {
			type: Number,
			primary: true,
		},
		tagId: {
			type: Number,
			primary: true,
			nullable: false,
		},
	},
	relations: {
		post: {
			nullable: false,
			target: () => Post,
			type: 'many-to-one',
			joinColumn: [
				{ name: 'tagPostId', referencedColumnName: 'postId' },
				{ name: 'tagOtherId', referencedColumnName: 'otherId' },
			],
		},
	},
});
