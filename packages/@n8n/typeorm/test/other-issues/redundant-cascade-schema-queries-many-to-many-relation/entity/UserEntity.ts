import { EntitySchema } from '../../../../src';
import { Team } from './TeamEntity';

export type User = {
	id: number;
	teams: Team[];
};

export const UserEntity = new EntitySchema<User>({
	name: 'user',
	columns: {
		id: {
			primary: true,
			type: 'int',
			generated: 'increment',
		},
	},
	relations: {
		teams: {
			type: 'many-to-many',
			target: 'team',
			inverseSide: 'users',
		},
	},
});
