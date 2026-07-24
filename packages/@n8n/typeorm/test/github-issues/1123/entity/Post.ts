import { EntitySchemaOptions } from '../../../../src/entity-schema/EntitySchemaOptions';
import { Author } from './Author';

export class Post {
	id: number;

	title: string;

	author: Author;
}

export const PostSchema: EntitySchemaOptions<Post> = {
	name: 'Post',

	target: Post,

	columns: {
		id: {
			primary: true,
			type: Number,
		},

		title: {
			type: String,
		},
	},

	relations: {
		author: {
			target: () => Author,
			type: 'many-to-one',
			eager: true,
		},
	},
};
