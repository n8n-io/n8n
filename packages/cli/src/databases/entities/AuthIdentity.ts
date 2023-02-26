import { Column, Entity, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import { AbstractEntity } from './AbstractEntity';
import { User } from './User';

export type AuthProviderType = 'ldap' | 'email' | 'saml'; // | 'google';

@Entity()
@Unique(['providerId', 'providerType'])
export class AuthIdentity extends AbstractEntity {
	@Column()
	userId: string;

	@ManyToOne(() => User, (user) => user.authIdentities)
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
