import { EntitySchema } from '../../../../../src';

export const UserEntity = new EntitySchema({
	name: 'User',
	tableName: 'user',
	columns: {
		id: {
			type: Number,
			primary: true,
		},
		firstName: {
			type: String,
			nullable: false,
		},
		secondName: {
			type: String,
			nullable: false,
		},
	},
});
