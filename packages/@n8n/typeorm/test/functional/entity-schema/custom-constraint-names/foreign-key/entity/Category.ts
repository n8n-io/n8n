import { EntitySchema } from '../../../../../../src';

export const CategorySchema = new EntitySchema<any>({
	name: 'category',
	columns: {
		id: {
			primary: true,
			type: Number,
			generated: 'increment',
		},
	},
});
