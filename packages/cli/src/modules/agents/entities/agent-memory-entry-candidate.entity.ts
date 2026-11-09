import type { EpisodicMemoryCaptureKind, EpisodicMemoryCaptureStatus } from '@n8n/agents';
import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';

import { AGENT_THREAD_ID_MAX_LENGTH } from '../integrations/types';

@Entity({ name: 'agents_memory_entry_candidates' })
@Index(['agentId', 'runId', 'toolCallId'], { unique: true })
@Index(['agentId', 'resourceId', 'status', 'createdAt', 'id'])
@Index(['resourceId'])
@Index(['threadId'])
@Index(['sourceMessageId'])
export class AgentMemoryEntryCandidateEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@Column({ type: 'varchar', length: AGENT_THREAD_ID_MAX_LENGTH })
	threadId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	sourceMessageId: string | null;

	@Column({ type: 'varchar', length: 255 })
	runId: string;

	@Column({ type: 'varchar', length: 255 })
	toolCallId: string;

	@Column({ type: 'text' })
	content: string;

	@Column({ type: 'text' })
	evidenceText: string;

	@Column({ type: 'varchar', length: 32 })
	kind: EpisodicMemoryCaptureKind;

	@Column({ type: 'varchar', length: 16, default: 'pending' })
	status: EpisodicMemoryCaptureStatus;

	@Column({ type: 'smallint', default: 0 })
	attemptCount: number;
}
