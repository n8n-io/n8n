import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

@Entity({ name: 'agent_files' })
@Index(['agentId', 'createdAt'])
@Index(['agentId', 'fileName'], { unique: true })
@Index(['agentId', 'binaryDataId'], { unique: true })
export class AgentFile extends WithTimestampsAndStringId {
	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	/**
	 * Opaque Daytona volume storage reference (e.g. `daytona-volume:<fileId>.txt`).
	 * Not a DB FK — the bytes live on the mounted knowledge volume.
	 */
	@Column({ type: 'text' })
	binaryDataId: string;

	// fileName/mimeType/fileSizeBytes are intentionally denormalized rather than
	// joined from binary_data: (1) binaryDataId is an opaque storage reference,
	// not an FK; (2) we keep the original user-facing values, which differ from
	// the stored volume object for converted uploads (a PDF is stored as extracted
	// text with a different byte size).
	@Column({ type: 'varchar', length: 255 })
	fileName: string;

	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	@Column({ type: 'int' })
	fileSizeBytes: number;
}
