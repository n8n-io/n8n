import { createComponentRenderer } from '@n8n/frontend-test-utils';

import { blocked } from '../../__tests__/bindings.fixtures';
import PromotionBlockers from './PromotionBlockers.vue';

vi.mock('../../composables/usePromotionBindingCreation', () => ({
	usePromotionBindingCreation: () => ({ createBinding: vi.fn(), updateCheck: vi.fn() }),
}));

const renderComponent = createComponentRenderer(PromotionBlockers, {
	global: { stubs: { N8nIcon: true } },
});

it.each([
	['unavailable', 'Skills are unavailable on this instance. Ask an instance admin to enable them.'],
	['in-use', 'An agent still uses this skill. Remove its references before you delete the skill.'],
	[
		'source-managed',
		'This instance syncs the skill from a source. Stop syncing it before you apply.',
	],
] as const)('translates the %s Skill conflict into a next step', (reason, message) => {
	const result = blocked({
		missingBindings: [],
		conflicts: [{ kind: 'skill', code: 'skill-conflict', id: 'skill_one', reason }],
	});
	const { getByText } = renderComponent({
		props: {
			busy: false,
			check: {
				environmentId: result.environmentId,
				git: result.git,
				...result.check,
				movedWorkflows: [],
				movedFolders: [],
			},
		},
	});
	expect(getByText(message)).toBeVisible();
});
