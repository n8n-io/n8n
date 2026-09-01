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
		header: {
			type: String,
		},
	},
	indices: [
		{
			name: 'IDX_NAME',
			columns: ['name'],
		},
		{
			name: 'IDX_HEADER',
			columns: ['header'],
		},
	],
});
