import type { SerializedSkill } from '../../../spec/serialized/skill.schema';
import { reconcileSharedWrites, type SkillImportPlan } from '../skill-import.types';

function instanceSkill(id: string, name = id): SerializedSkill {
	return {
		id,
		scope: 'instance',
		skill: { name, description: 'Review.', instructions: 'Review.' },
		frontmatter: null,
	};
}

function plan(...ids: string[]): SkillImportPlan {
	const target = { projectId: null, agentId: null };
	return {
		shared: ids.map((id) => ({ skill: instanceSkill(id), target, usedBy: [`agent_${id}`] })),
		owned: new Map(),
		sharedUsers: new Set(),
		raisedRevisions: new Map(),
	};
}

describe('reconcileSharedWrites', () => {
	it('keeps the first write of a skill that several project scopes plan', () => {
		const plans = [plan('shared', 'first'), plan('shared', 'second'), plan('shared')];
		expect(reconcileSharedWrites(plans)).toEqual([[], [], []]);
		expect(plans.map(({ shared }) => shared.map(({ skill }) => skill.id))).toEqual([
			['shared', 'first'],
			['second'],
			[],
		]);
	});

	it('reports a second instance skill with a name like a planned one', () => {
		const plans = [plan('first'), plan('second')];
		plans[1].shared[0].skill = instanceSkill('second', 'FIRST');
		expect(reconcileSharedWrites(plans)).toEqual([
			[],
			[
				{
					type: 'agent-invalid',
					sourceAgentId: 'agent_second',
					path: 'skills.second',
					message:
						'Another instance skill of this package has the same name "FIRST". Rename one of the skills.',
				},
			],
		]);
	});

	it('reports a project skill that two project scopes plan for their own projects', () => {
		const plans = [plan('shared'), plan('shared')];
		plans[0].shared[0].target = { projectId: 'project_1', agentId: null };
		plans[1].shared[0].target = { projectId: 'project_2', agentId: null };
		plans[1].shared[0].usedBy = ['agent_second'];
		expect(reconcileSharedWrites(plans)).toEqual([
			[],
			[
				expect.objectContaining({
					sourceAgentId: 'agent_second',
					path: 'skills.shared',
					message: expect.stringContaining('belongs to another project of this package'),
				}),
			],
		]);
		expect(plans.map(({ shared }) => shared.length)).toEqual([1, 0]);
	});
});
