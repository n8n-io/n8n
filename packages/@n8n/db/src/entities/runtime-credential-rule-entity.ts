import { Column, Entity, PrimaryGeneratedColumn, Unique } from '@n8n/typeorm';

import { WithTimestamps } from './abstract-entity';

/** An instance-wide run-time input rule that an admin manages. Environment rules are not stored. */
@Entity({ name: 'runtime_credential_rule' })
@Unique(['alias'])
export class RuntimeCredentialRuleEntity extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 255 })
	alias: string;

	@Column({ type: 'varchar', length: 255 })
	nodeType: string;

	@Column({ type: 'text' })
	path: string;

	@Column({ type: 'varchar', length: 255 })
	credentialType: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	transform: string | null;

	@Column({ type: 'text', nullable: true })
	allowedDomains: string | null;
}
