import { EntitySchema } from '../../../../src';

import Post from './Post';

let id = 0;

export default class PostAttachment {
	postPostId: number;
	postOtherId: number;
	attachmentId: number;

	post: Post;

	constructor() {
		this.attachmentId = id++;
	}
}

export const PostAttachmentSchema = new EntitySchema<PostAttachment>({
	name: 'PostAttachment',
	target: PostAttachment,
	columns: {
		postPostId: {
			type: Number,
			primary: true,
			nullable: false,
		},
		postOtherId: {
			type: Number,
			primary: true,
			nullable: false,
		},
		attachmentId: {
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
		},
	},
});
