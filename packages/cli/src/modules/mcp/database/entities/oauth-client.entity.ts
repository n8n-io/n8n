import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, OneToMany } from '@n8n/typeorm';

import type { AccessToken } from './oauth-access-token.entity';
import type { AuthorizationCode } from './oauth-authorization-code.entity';
import type { RefreshToken } from './oauth-refresh-token.entity';
import type { UserConsent } from './oauth-user-consent.entity';

@Entity('oauth_clients')
export class OAuthClient extends WithTimestamps {
	@Column({ type: 'varchar', primary: true })
	id: string;

	@Column({ type: String })
	name: string;

	@JsonColumn()
	redirectUris: string[];

	@JsonColumn()
	grantTypes: string[];

	@Column({ type: String, default: 'none' })
	tokenEndpointAuthMethod: string;

	@OneToMany('AuthorizationCode', 'client')
	authorizationCodes: AuthorizationCode[];

	@OneToMany('AccessToken', 'client')
	accessTokens: AccessToken[];

	@OneToMany('RefreshToken', 'client')
	refreshTokens: RefreshToken[];

	@OneToMany('UserConsent', 'client')
	userConsents: UserConsent[];

	@Column({ type: String, nullable: true })
	clientSecret: string | null;

	@Column({ type: 'int', nullable: true })
	clientSecretExpiresAt: number | null;
}
