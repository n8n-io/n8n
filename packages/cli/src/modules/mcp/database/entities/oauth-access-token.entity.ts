import { User } from '@n8n/db';
import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';

import { OAuthClient } from './oauth-client.entity';

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

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	user: User;

	@Index()
	@Column({ type: String })
	userId: string;
}
