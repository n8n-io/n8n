import { EntitySchemaOptions } from '../../../../src/entity-schema/EntitySchemaOptions';

export enum PostType {
	draft = 'draft',
	published = 'published',
}

export class Post {
	id: number;

	type: PostType;
}

export const PostSchema: EntitySchemaOptions<Post> = {
	name: 'Post',

	target: Post,

	columns: {
		id: {
			primary: true,
			type: Number,
		},

		type: {
			type: 'simple-enum',
			enum: PostType,
		},
	},
};
