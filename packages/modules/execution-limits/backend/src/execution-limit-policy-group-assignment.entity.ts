import { WithCreatedAt } from '@n8n/db';
import { Entity, PrimaryColumn } from '@n8n/typeorm';

export type ExecutionLimitPolicyGroup = 'newProjects' | 'personalProjects';

/** Applies one policy to a group of projects. The migration declares the foreign key. */
@Entity('execution_limit_policy_group_assignment')
export class ExecutionLimitPolicyGroupAssignment extends WithCreatedAt {
	@PrimaryColumn('uuid')
	policyId: string;

	@PrimaryColumn({ type: 'varchar', length: 32 })
	group: ExecutionLimitPolicyGroup;
}
