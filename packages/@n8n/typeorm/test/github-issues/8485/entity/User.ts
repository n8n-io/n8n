import { Entity, OneToOne, PrimaryGeneratedColumn } from '../../../../src';
import { UserProfile } from './UserProfile';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	public id: number;

	@OneToOne(
		() => UserProfile,
		(userProfile) => userProfile.user,
	)
	public profile: UserProfile;
}
