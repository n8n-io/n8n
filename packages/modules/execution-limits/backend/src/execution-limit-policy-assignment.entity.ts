import { WithCreatedAt } from '@n8n/db';
import { Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** Applies one policy to one project. The migration declares the two foreign keys. */
@Entity('execution_limit_policy_assignment')
export class ExecutionLimitPolicyAssignment extends WithCreatedAt {
	@PrimaryColumn('uuid')
	policyId: string;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	projectId: string;
}
