import { Column, Entity, Index, ManyToOne, Unique } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import { User } from './user';

@Entity('user_api_keys')
@Unique(['userId', 'label'])
export class ApiKey extends WithTimestampsAndStringId {
	@ManyToOne(
		() => User,
		(user) => user.id,
		{ onDelete: 'CASCADE' },
	)
	user: User;

	@Column({ type: String })
	userId: string;

	@Column({ type: String })
	label: string;

	@Index({ unique: true })
	@Column({ type: String })
	apiKey: string;
}
