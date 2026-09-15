import { EntitySchema } from '../../../../../../src';

export const PostSchema = new EntitySchema<any>({
	name: 'post',
	columns: {
		id: {
			primary: true,
			type: Number,
			generated: 'increment',
		},
		name: {
			type: String,
		},
	},
	uniques: [
		{
			name: 'UQ_NAME',
			columns: ['name'],
		},
	],
});
