import { Name, NameEntitySchema } from './Name';
import { EntitySchema } from '../../../../../../src';

export class User {
	id: string;
	name: Name;
	isActive: boolean;
}

export const UserEntitySchema = new EntitySchema<User>({
	name: User.name,
	target: User,
	columns: {
		id: {
			type: Number,
			primary: true,
			generated: true,
		},
		isActive: {
			type: Boolean,
		},
	},
	embeddeds: {
		name: {
			schema: NameEntitySchema,
			prefix: 'name_',
		},
	},
});
