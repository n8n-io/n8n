import { WithTimestamps } from '@n8n/db';
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { AgentExecutionThread } from './agent-execution-thread.entity';

import { AGENT_THREAD_ID_MAX_LENGTH } from '../integrations/types';

@Entity({ name: 'agent_thread_grants' })
export class AgentThreadGrant extends WithTimestamps {
	@ManyToOne(() => AgentExecutionThread, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: AgentExecutionThread;

	@PrimaryColumn({ type: 'varchar', length: AGENT_THREAD_ID_MAX_LENGTH })
	threadId: string;

	@PrimaryColumn({
		type: 'varchar',
		length: 512,
		comment: 'JSON tuple: [tool, toolName] or [integration_action, connectionId, action]',
	})
	grantKey: string;
}
