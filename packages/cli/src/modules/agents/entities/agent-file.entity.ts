import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

@Entity({ name: 'agent_files' })
@Index(['agentId', 'createdAt'])
export class AgentFile extends WithTimestampsAndStringId {
	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	/**
	 * Opaque BinaryDataService reference (mode-prefixed, e.g.
	 * `filesystem-v2:<uuid>` or `s3:<key>`). Not a DB FK: in filesystem/object-
	 * store modes there is no `binary_data` row to reference.
	 */
	@Column({ type: 'text' })
	binaryDataId: string;

	// fileName/mimeType/fileSizeBytes are intentionally denormalized rather than
	// joined from binary_data: (1) binaryDataId is an opaque storage reference,
	// not an FK, and binary_data only holds rows in DB storage mode; (2) we keep
	// the original user-facing values, which differ from the stored binary for
	// converted uploads (a PDF is stored as extracted `*.pdf.txt` text/plain with
	// a different byte size).
	@Column({ type: 'varchar', length: 255 })
	fileName: string;

	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	@Column({ type: 'int' })
	fileSizeBytes: number;
}
