import { OneToMany, PrimaryColumn } from '../../../../src';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { PolicyGroup } from './PolicyGroup';

@Entity()
export class Group {
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
