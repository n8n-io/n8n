import { Column, Entity } from '@n8n/typeorm';

import { DateTimeColumn } from './abstract-entity';
import { bigintStringToNumber } from '../utils/transformers';

/** Instance totals survive agent and session deletion. */
@Entity({ name: 'agent_execution_statistics' })
export class AgentExecutionStatistics {
	@DateTimeColumn({ primary: true, precision: 3, comment: 'Start of the UTC day' })
	periodStart: Date;

	@Column({ type: 'bigint', transformer: bigintStringToNumber })
	count: number;
}
