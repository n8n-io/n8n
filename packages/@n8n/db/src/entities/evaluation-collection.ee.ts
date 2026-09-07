import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { JsonColumn, WithTimestamps } from './abstract-entity';

/**
 * A named, user-curated group of {@link TestRun}s sharing one
 * {@link EvaluationConfig} (= one dataset + one set of metrics + one workflow),
 * typically spread across multiple workflow versions. The collection is the
 * unit of comparison in the eval compare view.
 *
 * Invariants enforced at the service layer:
 *  - Every run in a collection has the same `evaluationConfigId`.
 *  - Every run is on the same workflow as the collection.
 *  - Runs typically differ by `workflowVersionId`.
 *
 * **TypeORM relations:** the `workflowId` and `evaluationConfigId` columns
 * are FK columns *without* `@ManyToOne` decorators. Service code resolves
 * the related entities through their own repositories. Declaring the
 * relations on this entity would extend the TypeORM entity-relation type
 * graph enough to trip TS2589 ("type instantiation excessively deep") in
 * unrelated repositories that transitively reach `TestRun` →
 * `EvaluationCollection` through `WorkflowEntity.testRuns` — e.g.
 * `FolderRepository.upsert()` in `source-control-import.service.ee.ts`.
 * The FK constraints are preserved by the migration's raw SQL; the
 * decorators are purely TypeORM-side metadata.
 */
@Entity()
export class EvaluationCollection extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	id: string;

	@Column('varchar', { length: 128 })
	name: string;

	@Column('text', { nullable: true })
	description: string | null;

	@Index()
	@Column('varchar', { length: 36 })
	workflowId: string;

	@Index()
	@Column('varchar', { length: 36 })
	evaluationConfigId: string;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	/**
	 * Cached AI-generated insights for this collection. Lazily populated when
	 * a user opens the compare view; re-generated when runs change. Shape
	 * mirrors the `AiInsightsResponse` type produced by the insights agent —
	 * stored loose here so PR 2 can iterate on the schema without a migration.
	 */
	@JsonColumn({ nullable: true })
	insightsCache: IDataObject | null;
}
