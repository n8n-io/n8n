import {
	BaseEntity,
	Column,
	Entity,
	OneToMany,
	OneToOne,
	PrimaryGeneratedColumn,
} from '../../../../src';
import { Admin } from './Admin';
import { OrganizationMembership } from './OrganizationMembership';

@Entity()
export class User extends BaseEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	randomField: string;

	@OneToOne(
		() => Admin,
		(admin) => admin.user,
		{ nullable: true },
	)
	admin: Admin;

	@OneToMany(
		() => OrganizationMembership,
		(membership) => membership.user,
		{
			nullable: true,
		},
	)
	membership: OrganizationMembership[];
}
