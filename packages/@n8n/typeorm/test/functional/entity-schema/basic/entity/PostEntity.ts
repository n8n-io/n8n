import { EntitySchema } from '../../../../../src';
import { Post } from '../model/Post';

export const PostEntity = new EntitySchema<Post>({
	name: 'post',
	columns: {
		id: {
			type: Number,
			primary: true,
		},
		title: {
			type: String,
		},
		text: {
			type: String,
		},
	},
	relations: {
		categories: {
			type: 'many-to-many',
			target: 'category', // CategoryEntity
			joinTable: true,
		},
	},
});
