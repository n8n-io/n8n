import type { ApiKeyScope } from '@n8n/permissions';
import { Column, Entity, Index, ManyToOne, Unique } from '@n8n/typeorm';

import { jsonColumnType, WithTimestampsAndStringId } from './abstract-entity';
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

	@Column({ type: jsonColumnType, nullable: false })
	scopes: ApiKeyScope[];

	@Index({ unique: true })
	@Column({ type: String })
	apiKey: string;
}
