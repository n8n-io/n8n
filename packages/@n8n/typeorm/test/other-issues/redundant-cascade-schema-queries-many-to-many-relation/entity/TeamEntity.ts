import { EntitySchema } from '../../../../src';
import { User } from './UserEntity';

export type Team = {
	id: number;
	users: User[];
};

export const TeamEntity = new EntitySchema<Team>({
	name: 'team',
	columns: {
		id: {
			primary: true,
			type: 'int',
			generated: 'increment',
		},
	},
	relations: {
		users: {
			type: 'many-to-many',
			target: 'user',
			joinTable: { name: 'user_team' },
			inverseSide: 'teams',
		},
	},
});
