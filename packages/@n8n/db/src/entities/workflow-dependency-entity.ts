import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { WorkflowEntity } from './workflow-entity';

export type DependencyType = 'credential' | 'nodeType' | 'webhookPath' | 'subWorkflow';

@Entity()
export class WorkflowDependency extends WithTimestampsAndStringId {
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
	dependencyId: string;

	/**
	 * The node ID the dependency is associated with, if applicable.
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	nodeId: string | null;

	/**
	 * The version of the index structure. Used for migrations and updates.
	 */
	@Column({ type: 'int', default: 1 })
	indexVersionId: number;

	@ManyToOne('WorkflowEntity', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'workflowId' })
	workflow: WorkflowEntity;
}
