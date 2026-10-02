import { Entity } from '../../../../src/decorator/entity/Entity';
import { JoinColumn, ManyToOne, PrimaryColumn } from '../../../../src/index';
import { Policy } from './Policy';
import { Group } from './Group';

@Entity()
export class PolicyGroup {
	@PrimaryColumn()
	policyId: number;

	@ManyToOne(
		() => Policy,
		(policy) => policy.id,
		{
			eager: true,
			nullable: false,
		},
	)
	@JoinColumn()
	policy: Policy;

	@PrimaryColumn()
	groupId: number;

	@ManyToOne(
		() => Group,
		(group) => group.id,
		{
			eager: true,
			nullable: false,
		},
	)
	group: Group;
}
