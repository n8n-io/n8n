import { EntitySchema } from '../../../../../../src';

export const UserSchema = new EntitySchema<any>({
	name: 'user',
	columns: {
		name: {
			primary: true,
			type: String,
			primaryKeyConstraintName: 'PK_ID',
		},
	},
});
