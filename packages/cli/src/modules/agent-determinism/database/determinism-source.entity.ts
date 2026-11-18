import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index } from '@n8n/typeorm';
import type { GeneratedFromSourceType } from 'n8n-workflow';

import type { DeterminismResult } from '../agent-determinism.contracts';

export type AnalysisStatus = 'idle' | 'running' | 'failed';

@Entity('agent_determinism_source')
@Index(['sourceType', 'sourceId'], { unique: true })
export class DeterminismSourceEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 16 })
	sourceType: GeneratedFromSourceType;

	@Column({ type: 'varchar', length: 36 })
	sourceId: string;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 64 })
	versionHash: string;

	@Column({ type: 'int', default: 0 })
	runsSinceAnalysis: number;

	@Column({ type: 'varchar', length: 16 })
	analysisStatus: AnalysisStatus;

	@Column({ type: 'varchar', length: 64, nullable: true })
	analyzedVersionHash: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	draftWorkflowId: string | null;

	@JsonColumn({ nullable: true })
	result: DeterminismResult | null;

	@DateTimeColumn({ nullable: true })
	dismissedAt: Date | null;
}
