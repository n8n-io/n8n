import { Column, Entity, Index, ManyToOne, OneToMany, JoinColumn, Relation } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { PolicyProjectAssignment } from './policy-project-assignment';
import { User } from './user';

export type PolicyType = 'allow' | 'block';
export type PolicyScope = 'global' | 'projects';
export type TargetType = 'node' | 'category';

@Entity()
@Index(['scope', 'targetType', 'targetValue'])
export class NodeGovernancePolicy extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 10 })
	policyType: PolicyType;

	@Column({ type: 'varchar', length: 10, default: 'global' })
	scope: PolicyScope;

	@Column({ type: 'varchar', length: 20 })
	targetType: TargetType;

	@Column({ type: 'varchar', length: 255 })
	targetValue: string;

	@Column({ type: String, nullable: true })
	createdById: string | null;

	@ManyToOne('User', { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'createdById' })
	createdBy?: Relation<User>;

	@OneToMany('PolicyProjectAssignment', 'policy')
	projectAssignments: PolicyProjectAssignment[];
}
