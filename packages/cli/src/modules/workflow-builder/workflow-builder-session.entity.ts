import type { StoredMessage } from '@langchain/core/messages';
import { JsonColumn, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Unique,
} from '@n8n/typeorm';
import type { Relation } from '@n8n/typeorm';

export interface IWorkflowBuilderSession {
	id: string;
	workflowId: string;
	userId: string;
	/** Serialized LangChain messages in StoredMessage format */
	messages: StoredMessage[];
	previousSummary: string | null;
	createdAt: Date;
	updatedAt: Date;
}

@Entity({ name: 'workflow_builder_session' })
@Unique(['workflowId', 'userId'])
export class WorkflowBuilderSession extends WithTimestamps implements IWorkflowBuilderSession {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow?: Relation<object>;

	@Column({ type: 'uuid' })
	userId: string;

	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user?: Relation<object>;

	/** Serialized LangChain messages in StoredMessage format */
	@JsonColumn({ default: '[]' })
	messages: StoredMessage[];

	@Column({ type: 'text', nullable: true, default: null })
	previousSummary: string | null;
}
