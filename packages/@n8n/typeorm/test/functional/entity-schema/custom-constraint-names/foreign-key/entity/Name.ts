import { EntitySchema } from '../../../../../../src';

export const NameSchema = new EntitySchema<any>({
	name: 'name',
	columns: {
		id: {
			primary: true,
			type: Number,
			generated: 'increment',
		},
	},
});
