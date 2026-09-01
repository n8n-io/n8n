import { EntitySchemaOptions } from '../../../../src/entity-schema/EntitySchemaOptions';

export class Post {
	id: number;
	name: string;
	title: string;
}

export const PostSchema: EntitySchemaOptions<Post> = {
	name: 'Post',
	target: Post,
	columns: {
		id: {
			primary: true,
			type: Number,
		},
		name: {
			type: String,
			unique: true,
		},
		title: {
			type: String,
		},
	},
};
