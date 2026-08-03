import { EntitySchema } from '../../../../../../src';

export class Name {
	first: string;
	last: string;
}

export const NameEntitySchema = new EntitySchema<Name>({
	name: 'name',
	target: Name,
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
