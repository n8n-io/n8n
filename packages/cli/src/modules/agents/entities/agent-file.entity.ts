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
	 * BinaryDataService id (e.g. `filesystem-v2:agents/<agentId>/knowledge-files/<fileId>/binary_data/<uuid>`).
	 * Not a DB FK — see `BinaryDataService` in `n8n-core` for how the bytes are resolved from this id.
	 */
	@Column({ type: 'text' })
	binaryDataId: string;

	// fileName/mimeType/fileSizeBytes are intentionally denormalized rather than
	// joined from binary_data: (1) binaryDataId is an opaque storage reference,
	// not an FK; (2) we keep the original user-facing values, which differ from
	// the stored binary for converted uploads (a PDF is stored as extracted
	// text with a different byte size).
	@Column({ type: 'varchar', length: 255 })
	fileName: string;

	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	@Column({ type: 'int' })
	fileSizeBytes: number;
}
