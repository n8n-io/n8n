import { Column, Entity, ManyToOne, PrimaryColumn, Unique } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { AuthProviderType } from './types-db';
import { User } from './user';

@Entity()
@Unique(['providerId', 'providerType'])
export class AuthIdentity extends WithTimestamps {
	@Column()
	userId: string;

	@ManyToOne(
		() => User,
		(user) => user.authIdentities,
	)
	user: User;

	@PrimaryColumn()
	providerId: string;

	@PrimaryColumn()
	providerType: AuthProviderType;

	static create(
		user: User,
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
