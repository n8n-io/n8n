import { EntitySchema } from '../../../../src';

import { Base } from '../entity';

export const BaseSchema = new EntitySchema<Base>({
	target: Base,
	name: 'Base',
	columns: {
		id: {
			type: Number,
			primary: true,
			generated: 'increment',
		},
		type: {
			type: String,
		},
		createdAt: {
			type: Date,
			createDate: true,
		},
		updatedAt: {
			type: Date,
			updateDate: true,
		},
	},
	inheritance: {
		pattern: 'STI',
		column: 'type',
	},
});
