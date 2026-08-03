import { EntitySchema } from '../../../../src';

import { C } from '../entity';

import { BaseSchema } from './Base';

export const CSchema = new EntitySchema<C>({
	target: C,
	name: 'C',
	type: 'entity-child',
	discriminatorValue: 'custom-c',
	columns: {
		...BaseSchema.options.columns,
		c: {
			type: String,
		},
	},
});
