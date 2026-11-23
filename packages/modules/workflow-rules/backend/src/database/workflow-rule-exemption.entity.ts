import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';

/** Lets one workflow ignore one rule. Deleted with the workflow. */
@Entity('workflow_rule_exemption')
export class WorkflowRuleExemptionEntity extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 80 })
	ruleId: string;

	@Column({ type: 'text' })
	reason: string;

	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}
