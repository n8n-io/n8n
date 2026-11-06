import type {
	LlmBudgetAction,
	LlmBudgetMetric,
	LlmBudgetTarget,
	LlmBudgetWindow,
} from '@n8n/api-types';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

/** An admin budget on the LLM spend in `llm_usage`. Target IDs are soft references. */
@Entity({ name: 'llm_budget' })
export class LlmBudget extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: Boolean, default: true })
	enabled: boolean;

	@JsonColumn()
	target: LlmBudgetTarget;

	/** `window` is an SQL keyword. */
	@JsonColumn()
	timeWindow: LlmBudgetWindow;

	@Column({ type: 'varchar', length: 16 })
	metric: LlmBudgetMetric;

	/** `limit` is an SQL keyword. */
	@Column({ type: 'double precision' })
	limitAmount: number;

	@Column({ type: 'varchar', length: 16 })
	action: LlmBudgetAction;

	@JsonColumn()
	warnAtPercent: number[];

	/** The system that owns the budget. An admin budget has none. */
	@Column({ type: 'varchar', length: 32, nullable: true })
	managedBy: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	externalId: string | null;

	/** Raised by one on each write. A write must name the version it read. */
	@Column({ type: 'int', default: 1 })
	version: number;
}
