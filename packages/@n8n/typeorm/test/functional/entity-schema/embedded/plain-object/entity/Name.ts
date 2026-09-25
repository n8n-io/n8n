import { EntitySchema } from '../../../../../../src';

export interface Name {
	first: string;
	last: string;
}

export const NameEntitySchema = new EntitySchema<Name>({
	name: 'name',
	columns: {
		first: {
			type: String,
		},
		last: {
			type: String,
		},
	},
	indices: [
		{
			columns: ['first'],
		},
	],
});
