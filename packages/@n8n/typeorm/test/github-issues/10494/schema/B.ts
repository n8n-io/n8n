import { EntitySchema } from '../../../../src';

import { B } from '../entity';

import { BaseSchema } from './Base';

export const BSchema = new EntitySchema<B>({
	target: B,
	name: 'B',
	type: 'entity-child',
	columns: {
		...BaseSchema.options.columns,
		b: {
			type: Number,
		},
	},
});
