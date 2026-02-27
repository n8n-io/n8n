import { Column, Entity, Index, ManyToOne, JoinColumn } from '@n8n/typeorm';

import { WithTimestampsAndStringId, jsonColumnType } from './abstract-entity';
import { CredentialsEntity } from './credentials-entity';

@Entity('external_agent_registration')
export class ExternalAgentRegistration extends WithTimestampsAndStringId {
	@Column({ length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 500, nullable: true })
	description: string | null;

	@Column({ length: 2048 })
	remoteUrl: string;

	@Index()
	@Column({ length: 128 })
	remoteAgentId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	credentialId: string | null;

	@Column({ type: jsonColumnType, nullable: true })
	remoteCapabilities: { streaming?: boolean; multiTurn?: boolean } | null;

	@Column({ type: jsonColumnType, nullable: true })
	skills: Array<{ name: string; description?: string }> | null;

	@Column({ type: jsonColumnType, nullable: true })
	requiredCredentials: Array<{ type: string; description: string }> | null;

	/** Maps remote credential type → local credential ID */
	@Column({ type: jsonColumnType, nullable: true })
	credentialMappings: Record<string, string> | null;

	@ManyToOne(() => CredentialsEntity, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'credentialId' })
	credential: CredentialsEntity | null;
}
