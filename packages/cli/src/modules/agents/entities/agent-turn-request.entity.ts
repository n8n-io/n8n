import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import type { AgentTurnRequestPayload } from '../queue/agent-turn-request.types';

/**
 * An agent turn that a main sends to a worker, for example the answer to a
 * tool approval. The process that runs the turn claims the row first, so the
 * turn runs at most once.
 */
@Entity({ name: 'agent_turn_request' })
export class AgentTurnRequest extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	id: string;

	@Column({ type: 'varchar', length: 32, comment: 'Kind of turn, for example chat-resume' })
	kind: AgentTurnRequestPayload['kind'];

	@JsonColumn({ comment: 'Input of the turn and the identity that runs it' })
	payload: AgentTurnRequestPayload;

	@Column({
		type: 'varchar',
		length: 64,
		nullable: true,
		comment: 'Instance key of the process that claimed the turn; NULL means pending',
	})
	claimedBy: string | null;
}
