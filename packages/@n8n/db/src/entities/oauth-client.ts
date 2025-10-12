import { Column, Entity, OneToMany } from '@n8n/typeorm';

import { JsonColumn, WithTimestamps } from './abstract-entity';
import type { AccessToken } from './oauth-access-token';
import type { AuthorizationCode } from './oauth-authorization-code';
import type { RefreshToken } from './oauth-refresh-token';
import type { UserConsent } from './oauth-user-consent';

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
}
