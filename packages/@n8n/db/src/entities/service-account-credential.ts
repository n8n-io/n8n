import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';
import { User } from './user';

@Entity({ name: 'service_account_credential' })
export class ServiceAccountCredential extends WithTimestamps {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(
		() => User,
		(user) => user.id,
		{ onDelete: 'CASCADE' },
	)
	user: User;

	@Column({ type: String })
	userId: string;

	@Column({ type: String, nullable: false })
	credentialType: string;

	@Column({ type: String })
	clientId: string;

	/**
	 * Client secret, reversibly encrypted with the instance `Cipher` (same AES
	 * helper as all n8n credential encryption) so the runtime can recover it to
	 * mint tokens. Cipher output is longer than the previous bcrypt hash but still
	 * fits `text`, so the column type is unchanged.
	 */
	@Column({ type: String })
	clientSecret: string;
}
