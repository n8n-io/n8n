import { Entity, JoinColumn, OneToOne, PrimaryColumn } from '../../../../src';
import { User } from './User';

@Entity()
export class UserProfile {
	@PrimaryColumn()
	public userId: number;

	@OneToOne(
		() => User,
		(user) => user.profile,
	)
	@JoinColumn()
	public user: User;
}
