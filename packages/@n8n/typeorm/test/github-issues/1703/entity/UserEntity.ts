import { Entity, OneToMany, PrimaryGeneratedColumn } from '../../../../src';
import { UserToOrganizationEntity } from './UserToOrganizationEntity';

@Entity('user')
export class UserEntity {
	@PrimaryGeneratedColumn()
	id?: number;

	@OneToMany(
		(type) => UserToOrganizationEntity,
		(userToOrganization) => userToOrganization.user,
	)
	organizations: UserToOrganizationEntity[];
}
