import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

/**
 * Prototype. Values that a user added for a branch credential that this instance lacks. One draft
 * for each project and branch credential, so the members of the project share it.
 */
@Entity('promotion_credential_draft')
export class PromotionCredentialDraft extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;

	@PrimaryColumn({ type: 'varchar', length: 36 })
	sourceCredentialId: string;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	/** Encrypted JSON of the values. */
	@Column({ type: 'text' })
	data: string;

	@Column({ type: 'uuid', nullable: true })
	updatedById: string | null;
}
