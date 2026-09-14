import { EntitySchema } from '../../../../src';

import { A } from '../entity';

import { BaseSchema } from './Base';

export const ASchema = new EntitySchema<A>({
	target: A,
	name: 'A',
	type: 'entity-child',
	columns: {
		...BaseSchema.options.columns,
		a: {
			type: Boolean,
		},
	},
});
