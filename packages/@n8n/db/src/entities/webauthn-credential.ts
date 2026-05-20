import { Column, Entity, Index, ManyToOne } from '@n8n/typeorm';

import { BinaryColumn, JsonColumn, WithTimestampsAndStringId } from './abstract-entity';
import { User } from './user';

@Entity('webauthn_credential')
export class WebauthnCredential extends WithTimestampsAndStringId {
	@ManyToOne(
		() => User,
		(user) => user.id,
		{ onDelete: 'CASCADE' },
	)
	user: User;

	@Column({ type: String })
	userId: string;

	@Index({ unique: true })
	@Column({ type: String })
	credentialId: string;

	@BinaryColumn()
	publicKey: Buffer;

	@Column({ type: 'int', default: 0 })
	counter: number;

	@Column({ type: String, length: 32, nullable: true })
	deviceType: string | null;

	@Column({ type: 'boolean', default: false })
	backedUp: boolean;

	@JsonColumn({ nullable: true })
	transports: string[] | null;

	@Column({ type: String, length: 36, nullable: true })
	aaguid: string | null;

	@Column({ type: String, length: 255 })
	label: string;

	@Column({ type: 'datetime', nullable: true })
	lastUsedAt: Date | null;
}
