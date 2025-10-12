import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';

import { OAuthClient } from './oauth-client';

@Entity('oauth_access_tokens')
export class AccessToken {
	@Column({ type: 'varchar', primary: true })
	token: string;

	@ManyToOne(
		() => OAuthClient,
		(client) => client.accessTokens,
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

	@Column({ type: Boolean, default: false })
	revoked: boolean;
}
