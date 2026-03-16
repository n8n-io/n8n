import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	Unique,
} from '@n8n/typeorm';

@Entity({ name: 'webhook' })
@Unique(['method', 'path'])
@Index(['workflowId'])
export class WebhookEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ type: 'uuid' })
	workflowId!: string;

	@Column({ type: 'text' })
	method!: string;

	@Column({ type: 'text' })
	path!: string;

	@CreateDateColumn({ type: 'timestamptz' })
	createdAt!: Date;
}
