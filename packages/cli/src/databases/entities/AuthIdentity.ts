import { Column, Entity, ManyToOne, PrimaryColumn, Unique } from '@n8n/typeorm';
import { WithTimestamps } from './AbstractEntity';
import { AuthUser } from './AuthUser';

export type AuthProviderType = 'ldap' | 'email' | 'saml'; // | 'google';

@Entity()
@Unique(['providerId', 'providerType'])
export class AuthIdentity extends WithTimestamps {
	@Column()
	userId: string;

	@ManyToOne(() => AuthUser, (user) => user.authIdentities)
	user: AuthUser;

	@PrimaryColumn()
	providerId: string;

	@PrimaryColumn()
	providerType: AuthProviderType;

	static create(
		user: AuthUser,
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
