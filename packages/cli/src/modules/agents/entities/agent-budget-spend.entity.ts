import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { AGENT_THREAD_ID_MAX_LENGTH } from '../integrations/types';

/** Running USD total for one budget ledger key. */
@Entity({ name: 'agent_budget_spend' })
export class AgentBudgetSpend extends WithTimestamps {
	/** Session key is the root thread id. Month key is {agentId}:{YYYY-MM}. */
	@PrimaryColumn({
		type: 'varchar',
		length: AGENT_THREAD_ID_MAX_LENGTH,
		comment: 'Session key is the root thread id. Month key is {agentId}:{YYYY-MM}.',
	})
	key: string;

	/** Running USD estimate for this ledger key. A check rejects a negative total. */
	@Column({
		type: 'double precision',
		default: 0,
		comment: 'Running USD estimate for this ledger key. A check rejects a negative total.',
	})
	totalUsd: number;
}
