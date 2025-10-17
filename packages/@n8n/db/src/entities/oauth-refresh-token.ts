import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { OAuthClient } from './oauth-client';

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

	@Index()
	@Column({ type: String })
	userId: string;

	@Index()
	@Column({ type: 'int' })
	expiresAt: number;

	// @Column({ type: Boolean, default: false })
	// revoked: boolean;
}
