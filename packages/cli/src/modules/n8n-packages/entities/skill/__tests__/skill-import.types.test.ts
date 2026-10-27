import type { SerializedSkill } from '../../../spec/serialized/skill.schema';
import { dropRepeatedSharedWrites, type SkillImportPlan } from '../skill-import.types';

function instanceSkill(id: string): SerializedSkill {
	return {
		id,
		scope: 'instance',
		skill: { name: id, description: 'Review.', instructions: 'Review.' },
		frontmatter: null,
	};
}

function plan(...ids: string[]): SkillImportPlan {
	const target = { projectId: null, agentId: null };
	return { shared: ids.map((id) => ({ skill: instanceSkill(id), target })), owned: new Map() };
}

describe('dropRepeatedSharedWrites', () => {
	it('keeps the first write of a skill that several project scopes plan', () => {
		const plans = [plan('shared', 'first'), plan('shared', 'second'), plan('shared')];
		dropRepeatedSharedWrites(plans);
		expect(plans.map(({ shared }) => shared.map(({ skill }) => skill.id))).toEqual([
			['shared', 'first'],
			['second'],
			[],
		]);
	});
});
