import { EntitySchemaOptions } from '../../../../src/entity-schema/EntitySchemaOptions';
import { Author } from './Author';

export class Post {
	authorPublisherId: number;

	authorId: number;

	id: number;

	title: string;

	author: Author;
}

export const PostSchema: EntitySchemaOptions<Post> = {
	name: 'Post',

	target: Post,

	columns: {
		authorPublisherId: {
			primary: true,
			type: Number,
		},

		authorId: {
			primary: true,
			type: Number,
		},

		id: {
			primary: true,
			type: Number,
		},

		title: {
			type: 'varchar',
		},
	},

	relations: {
		author: {
			target: () => Author,
			type: 'many-to-one',
			eager: true,
			joinColumn: [
				{
					name: 'authorPublisherId',
					referencedColumnName: 'publisherId',
				},
				{ name: 'authorId', referencedColumnName: 'id' },
			],
		},
	},
};
