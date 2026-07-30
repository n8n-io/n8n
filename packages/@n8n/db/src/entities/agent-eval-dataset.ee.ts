import type { AgentEvalColumnMapping, DatasetRef } from '@n8n/api-types';
import { Column, Entity, Index } from '@n8n/typeorm';

import { JsonColumn, WithTimestampsAndStringId } from './abstract-entity';

// The FE/BE contract for this shape lives in `@n8n/api-types`; re-exported so
// existing db-internal consumers keep importing it from the entity.
export type { AgentEvalColumnMapping };

/**
 * A named, reusable eval setup for a single agent: which dataset to run and how
 * its columns map onto input / reference answer / "what to check".
 *
 * The dataset itself is **not** stored here — like {@link EvaluationConfig}, this
 * carries a polymorphic pointer (`datasetSource` + `datasetRef`) at an existing
 * Data Table (or Google Sheet); the rows are the cases. Reusing the shipped
 * `DatasetRef` shape gives Data Table and Google Sheets sources for free.
 *
 * **TypeORM relations:** `agentId` and `createdById` are plain FK columns *without*
 * `@ManyToOne` decorators — the target entities (`agents`, `user`) aren't part of
 * the `@n8n/db` entity registry, and declaring the relations would extend the
 * entity-relation type graph. The FK constraints are preserved by the migration's
 * raw SQL. Only the agent-eval subgraph (`dataset → run → result → rating`) uses
 * relation decorators.
 */
@Entity({ name: 'agent_eval_dataset' })
export class AgentEvalDataset extends WithTimestampsAndStringId {
	@Column('varchar', { length: 128 })
	name: string;

	@Column('text', { nullable: true })
	description: string | null;

	@Index()
	@Column('varchar', { length: 36 })
	agentId: string;

	@Column('varchar', { length: 32 })
	datasetSource: DatasetRef['datasetSource'];

	@JsonColumn()
	datasetRef: DatasetRef['datasetRef'];

	@JsonColumn({ nullable: true })
	columnMapping: AgentEvalColumnMapping | null;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}
