import { Column, Entity, OneToOne, JoinColumn, PrimaryColumn } from '../../../../src';
import { User } from './User';

@Entity()
export class Photo {
	@PrimaryColumn({ nullable: false })
	id: number;

	@OneToOne(() => User, { nullable: true })
	@JoinColumn({ name: 'user_id' })
	public user?: User;

	@Column({ name: 'user_id', nullable: true })
	public userId?: number;
}
