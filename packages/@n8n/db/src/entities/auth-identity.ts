import { Column, Entity, ManyToOne, PrimaryColumn, Unique } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { AuthProviderType } from './types-db';
import { Actor } from './actor';

@Entity()
@Unique(['providerId', 'providerType'])
export class AuthIdentity extends WithTimestamps {
	@Column()
	userId: string;

	@ManyToOne(
		() => Actor,
		(actor) => actor.authIdentities,
	)
	user: Actor;

	@PrimaryColumn({ length: 255 })
	providerId: string;

	@PrimaryColumn()
	providerType: AuthProviderType;

	static create(
		user: Actor,
		providerId: string,
		providerType: AuthProviderType = 'ldap',
	): AuthIdentity {
		const identity = new AuthIdentity();
		identity.user = user;
		identity.userId = user.id;
		identity.providerId = providerId;
		identity.providerType = providerType;
		return identity;
	}
}
