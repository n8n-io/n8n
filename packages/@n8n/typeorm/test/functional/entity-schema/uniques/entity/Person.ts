import { EntitySchema } from '../../../../../src/index';

export const PersonSchema = new EntitySchema<any>({
	name: 'Person',
	columns: {
		Id: {
			primary: true,
			type: Number,
			generated: 'increment',
		},
		FirstName: {
			type: String,
			length: 30,
		},
		LastName: {
			type: String,
			length: 50,
			nullable: false,
		},
	},
	uniques: [
		{
			name: 'UNIQUE_TEST',
			columns: ['FirstName', 'LastName'],
		},
	],
});
