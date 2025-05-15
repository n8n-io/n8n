import { RegisteredEntity } from '@n8n/db';
import { BaseEntity, Column, PrimaryGeneratedColumn } from '@n8n/typeorm';

@RegisteredEntity()
export class InsightsMetadata extends BaseEntity {
	@PrimaryGeneratedColumn()
	metaId: number;

	@Column({ unique: true, type: 'varchar', length: 16 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 128 })
	workflowName: string;

	@Column({ type: 'varchar', length: 255 })
	projectName: string;
}
