import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

export type WorkflowRuleSetScope = 'instance' | 'project';

/**
 * One rule set: the instance rule set, or the rules of one project. Two partial unique indexes
 * in the migration allow one instance row and one row for each project. The foreign keys are
 * declared in the migration only, to keep this entity apart from the core entities.
 */
@Entity('workflow_rule_set')
export class WorkflowRuleSetEntity extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 16 })
	scope: WorkflowRuleSetScope;

	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	/** A `RuleSet`. Readers parse it with `ruleSetSchema`, because a later release may change the shape. */
	@JsonColumn()
	config: unknown;

	@Column({ type: 'int', default: 1 })
	version: number;

	@Column({ type: 'uuid', nullable: true })
	updatedById: string | null;
}
