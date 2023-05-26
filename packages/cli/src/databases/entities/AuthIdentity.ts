import { Column, Entity, ManyToOne, PrimaryColumn, Relation, Unique } from 'typeorm';
import { AbstractEntity } from './AbstractEntity';
import type { User } from './User';

export type AuthProviderType = AuthIdentity['providerType'];

@Entity()
@Unique(['providerId', 'providerType'])
export class AuthIdentity extends AbstractEntity {
	@Column()
	userId: string;

	@ManyToOne('User', 'authIdentities')
	user: Relation<User>;

	@PrimaryColumn()
	providerId: string;

	@PrimaryColumn()
	providerType: 'ldap' | 'email' | 'saml'; // | 'google';

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
