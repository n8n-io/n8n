import { Column, Entity } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';

export const OAUTH_JWE_PRIVATE_KEY_TYPE = 'jwe.private-key';

/**
 * Private keys that sign OAuth access tokens. Not a `signing.*` name: that
 * prefix holds HMAC secrets, which have their own unique index.
 */
export const OAUTH_SIGNING_KEY_TYPE = 'oauth-server.signing-key';

@Entity()
export class DeploymentKey extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 64 })
	type: string;

	@Column('text')
	value: string;

	@Column({ type: 'varchar', length: 20, nullable: true })
	algorithm: string | null;

	@Column({ type: 'varchar', length: 20 })
	status: string;
}
