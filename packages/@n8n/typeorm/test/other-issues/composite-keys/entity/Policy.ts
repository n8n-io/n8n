import { Entity } from '../../../../src/decorator/entity/Entity';
import { OneToMany, PrimaryColumn } from '../../../../src/index';
import { PolicyGroup } from './PolicyGroup';

@Entity()
export class Policy {
	@PrimaryColumn()
	id: number;

	@OneToMany(
		() => PolicyGroup,
		(policyGroup) => policyGroup.policy,
	)
	groups: PolicyGroup[];

	@OneToMany(
		() => PolicyGroup,
		(policyGroup) => policyGroup.group,
	)
	policies: PolicyGroup[];
}
