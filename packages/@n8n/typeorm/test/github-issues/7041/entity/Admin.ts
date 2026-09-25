import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from '../../../../src';
import { User } from './User';
import { Organization } from './Organization';

@Entity()
export class Admin extends BaseEntity {
	@PrimaryColumn()
	userId: string;

	@OneToOne(
		() => User,
		(user) => user.admin,
	)
	@JoinColumn()
	user: User;

	@OneToOne(
		() => Organization,
		(org) => org.admin,
	)
	@JoinColumn()
	organization: Organization;

	@Column()
	randomField: string;
}
