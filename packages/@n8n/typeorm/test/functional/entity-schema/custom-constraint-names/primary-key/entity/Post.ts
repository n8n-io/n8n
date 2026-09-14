import { EntitySchema } from '../../../../../../src';

export const PostSchema = new EntitySchema<any>({
	name: 'post',
	columns: {
		name: {
			primary: true,
			type: String,
			primaryKeyConstraintName: 'PK_NAME_HEADER',
		},
		header: {
			primary: true,
			type: String,
			primaryKeyConstraintName: 'PK_NAME_HEADER',
		},
	},
});
