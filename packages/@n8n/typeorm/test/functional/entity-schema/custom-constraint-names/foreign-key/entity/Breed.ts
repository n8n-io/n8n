import { EntitySchema } from '../../../../../../src';

export const BreedSchema = new EntitySchema<any>({
	name: 'breed',
	columns: {
		id: {
			primary: true,
			type: Number,
			generated: 'increment',
		},
	},
});
