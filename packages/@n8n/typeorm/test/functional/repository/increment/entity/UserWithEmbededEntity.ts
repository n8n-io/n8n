import { Column, Entity, PrimaryColumn } from '../../../../../src';

class FriendStats {
	@Column({ default: 0 })
	count: number;

	@Column({ default: 0 })
	sent: number;

	@Column({ default: 0 })
	received: number;
}

@Entity()
export class UserWithEmbededEntity {
	@PrimaryColumn()
	id: number;

	@Column((type) => FriendStats)
	friend: FriendStats;
}
