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
export class Organization extends BaseEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@OneToOne(
		() => Admin,
		(admin) => admin.organization,
		{ nullable: true },
	)
	admin: Admin;

	@Column()
	randomField: string;

	@OneToMany(
		() => OrganizationMembership,
		(membership) => membership.organization,
	)
	membership: OrganizationMembership[];
}
