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

	@Column({ type: Boolean, default: false })
	isFirstParty: boolean;

	/**
	 * True for clients resolved from a Client ID Metadata Document (the
	 * `client_id` is an HTTPS URL). The row is persisted only to satisfy the
	 * consent/token foreign keys and is excluded from the registered-client cap,
	 * which exists to bound anonymous DCR registrations.
	 */
	@Column({ type: Boolean, default: false })
	isCimd: boolean;

	/**
	 * RFC 7591 / SEP-837 `application_type`. Only `native` clients get RFC 8252
	 * port-agnostic loopback redirect matching; `web` clients are matched
	 * exactly, so a web client can't claim an arbitrary localhost port. Defaults
	 * to `native` for rows registered before this field existed, preserving their
	 * prior matching behavior.
	 */
	@Column({ type: String, default: 'native' })
	applicationType: 'web' | 'native';

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
