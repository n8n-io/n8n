import { Column, CreateDateColumn, Entity, Index, ManyToOne } from '@n8n/typeorm';
import { WithStringId, tsColumnOptions } from './abstract-entity';
import { User } from './user';

@Entity('user_api_keys')
@Index(['userId', 'label'])
export class ApiKeys extends WithStringId {
	@ManyToOne(() => User, (user) => user.id)
	user: User;

	@Column('string')
	userId: string;

	@Column({ type: String })
	label: string;

	@Index({ unique: true })
	@Column({ type: String })
	apiKey: string;

	@CreateDateColumn(tsColumnOptions)
	createdAt: Date;

	@CreateDateColumn(tsColumnOptions)
	lastUsedAt: Date;
}
