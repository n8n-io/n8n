import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from '@n8n/typeorm';

import { OAuthClient } from './oauth-client';
import { User } from './user';

@Entity('oauth_user_consents')
@Unique(['userId', 'clientId'])
export class UserConsent {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	user: User;

	@Index()
	@Column({ type: String })
	userId: string;

	@ManyToOne(
		() => OAuthClient,
		(client) => client.userConsents,
		{ onDelete: 'CASCADE' },
	)
	client: OAuthClient;

	@Index()
	@Column({ type: String })
	clientId: string;

	@Column({ type: 'bigint' })
	grantedAt: number;
}
