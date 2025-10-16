import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Relation,
} from '@n8n/typeorm';

import { WithCreatedAt } from './abstract-entity';
import type { WorkflowEntity } from './workflow-entity';

export type DependencyType = 'credential' | 'nodeType' | 'webhookPath' | 'workflowCall';

@Entity({ name: 'workflow_dependency' })
export class WorkflowDependency extends WithCreatedAt {
	@PrimaryGeneratedColumn()
	id: number;

	/**
	 * The ID of the workflow the dependency belongs to.
	 */
	@Column({ length: 36 })
	@Index()
	workflowId: string;

	/**
	 * The version ID of the workflow the dependency belongs to.
	 * Used to ensure consistency between the workflow and dependency tables.
	 */
	@Column({ type: 'int' })
	workflowVersionId: number;

	/**
	 * The type of the dependency.
	 * credential | nodeType | webhookPath | workflowCall
	 */
	@Column({ length: 32 })
	@Index()
	dependencyType: DependencyType;

	/**
	 * The ID of the dependency, interpreted based on the dependency type.
	 * E.g., for 'credential' it would be the credential ID, for 'nodeType' the node type name, etc.
	 */
	@Column({ length: 255 })
	@Index()
	dependencyKey: string;

	/**
	 * Additional information about the dependency, interpreted based on the type.
	 * E.g., for 'nodeType' it could be the node ID, for 'webhookPath' the webhook ID.
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	dependencyInfo: string | null;

	/**
	 * The version of the index structure. Used for migrations and updates.
	 */
	@Column({ type: 'smallint', default: 1 })
	indexVersionId: number;

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;
}
