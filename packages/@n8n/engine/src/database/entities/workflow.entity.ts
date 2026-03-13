import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'workflow' })
@Index('idx_workflow_latest', ['id', 'version'], {})
export class WorkflowEntity {
	@PrimaryColumn({ type: 'uuid' })
	id!: string;

	@PrimaryColumn({ type: 'int' })
	version!: number;

	@Column({ type: 'text' })
	name!: string;

	@Column({ type: 'text' })
	code!: string;

	@Column({ type: 'text' })
	compiledCode!: string;

	@Column({ type: 'jsonb', default: [] })
	triggers!: unknown[];

	@Column({ type: 'jsonb', default: {} })
	settings!: Record<string, unknown>;

	@Column({ type: 'jsonb' })
	graph!: unknown;

	@Column({ type: 'text', nullable: true })
	sourceMap!: string | null;

	@Column({ type: 'boolean', default: false })
	active!: boolean;

	@Column({ type: 'timestamptz', nullable: true })
	deletedAt!: Date | null;

	@CreateDateColumn({ type: 'timestamptz' })
	createdAt!: Date;
}
