import { JoinTable, ManyToMany } from '../../../../src';
import { Column } from '../../../../src/decorator/columns/Column';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { Role } from './Role';

@Entity()
export class User {
	@Column({
		name: 'user_id',
		primary: true,
		type: 'int',
		generated: 'increment',
		transformer: {
			to(value: object) {
				return value?.toString();
			},
			from(value: object) {
				return value?.toString();
			},
		},
	})
	userId: string;

	@Column({ name: 'user_name' })
	userName: string;

	@ManyToMany((type) => Role)
	@JoinTable({
		name: 'user_role',
		joinColumn: {
			name: 'user_id',
			referencedColumnName: 'userId',
		},
		inverseJoinColumn: {
			name: 'role_id',
			referencedColumnName: 'roleId',
		},
	})
	roles: Role[];
}
