import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from '../../../../src';
import { User } from './User';
import { Organization } from './Organization';

@Entity()
export class OrganizationMembership extends BaseEntity {
	@PrimaryColumn()
	userId: string;

	@PrimaryColumn()
	organizationId: string;

	@ManyToOne(
		() => User,
		(user) => user.membership,
	)
	user: User;

	@ManyToOne(
		() => Organization,
		(organization) => organization.membership,
	)
	organization: Organization;

	@Column()
	accessLevel: string;
}
