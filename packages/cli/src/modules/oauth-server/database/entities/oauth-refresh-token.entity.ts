import { User, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';

import { OAuthClient } from './oauth-client.entity';

@Entity('oauth_refresh_tokens')
export class RefreshToken extends WithTimestamps {
	@Column({ type: 'varchar', primary: true })
	token: string;

	@ManyToOne(
		() => OAuthClient,
		(client) => client.refreshTokens,
		{ onDelete: 'CASCADE' },
	)
	client: OAuthClient;

	@Index()
	@Column({ type: String })
	clientId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	user: User;

	@Index()
	@Column({ type: String })
	userId: string;

	@Index()
	@Column({ type: 'int' })
	expiresAt: number;
}
