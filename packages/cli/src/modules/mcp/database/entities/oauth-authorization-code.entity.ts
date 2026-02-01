import { User, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';

import { OAuthClient } from './oauth-client.entity';

@Entity('oauth_authorization_codes')
export class AuthorizationCode extends WithTimestamps {
	@Column({ type: 'varchar', primary: true })
	code: string;

	@ManyToOne(
		() => OAuthClient,
		(client) => client.authorizationCodes,
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

	@Column({ type: String })
	redirectUri: string;

	@Column({ type: String })
	codeChallenge: string;

	@Column({ type: String })
	codeChallengeMethod: string;

	@Column({ type: String, nullable: true })
	state: string | null;

	@Index()
	@Column({ type: 'int' })
	expiresAt: number;

	@Column({ type: Boolean, default: false })
	used: boolean;
}
