import { Entity, Index, ManyToOne, JoinColumn, Relation, Column, Unique } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import { NodeGovernancePolicy } from './node-governance-policy';
import { Project } from './project';

@Entity()
@Index(['projectId'])
@Unique(['policyId', 'projectId'])
export class PolicyProjectAssignment extends WithTimestampsAndStringId {
	@Column({ type: String })
	policyId: string;

	@ManyToOne('NodeGovernancePolicy', 'projectAssignments', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'policyId' })
	policy: Relation<NodeGovernancePolicy>;

	@Column({ type: String })
	projectId: string;

	@ManyToOne('Project', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;
}
