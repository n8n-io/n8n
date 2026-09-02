import { Column } from '../../../../src/decorator/columns/Column';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity()
export class Role {
	@Column({
		name: 'role_id',
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
	roleId: string;

	@Column({ name: 'role_name' })
	roleName: string;
}
