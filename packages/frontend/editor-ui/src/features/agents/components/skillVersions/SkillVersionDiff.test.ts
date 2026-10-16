import { createTestingPinia } from '@pinia/testing';
import { configure, within } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import type { AgentSkill } from '../../types';
import SkillVersionDiff from './SkillVersionDiff.vue';

configure({ testIdAttribute: 'data-testid' });

vi.mock('v-code-diff', () => ({
	CodeDiff: {
		name: 'CodeDiff',
		props: ['oldString', 'newString', 'language'],
		template: '<div data-testid="code-diff" :data-old="oldString" :data-new="newString" />',
	},
}));

const renderComponent = createComponentRenderer(SkillVersionDiff, {
	pinia: createTestingPinia(),
});

const from: AgentSkill = {
	name: 'Refund policy',
	description: 'How to answer refund requests',
	instructions: 'Refunds are possible within 14 days.',
	references: [{ path: 'references/old.md', content: 'old' }],
};

describe('SkillVersionDiff', () => {
	it('shows a section for each part, with "No changes" on the unchanged ones', () => {
		const to: AgentSkill = {
			...from,
			instructions: 'Refunds are possible within 14 days.\nAsk for the order number first.',
			references: [
				{ path: 'references/old.md', content: 'old' },
				{ path: 'references/new.md', content: 'new' },
			],
		};
		const { getAllByTestId, getByTestId } = renderComponent({
			props: { from, to, fromLabel: 'v3', toLabel: 'v4' },
		});

		const sections = getAllByTestId('skill-version-diff-section');
		expect(sections.map((section) => section.getAttribute('data-section'))).toEqual([
			'name',
			'description',
			'instructions',
			'reference:references/old.md',
			'reference:references/new.md',
		]);
		expect(within(sections[0]).getByTestId('skill-version-diff-section-unchanged')).toBeVisible();
		expect(within(sections[2]).getByTestId('skill-version-diff-section-stat')).toHaveTextContent(
			'+1 −0',
		);
		expect(within(sections[2]).getByTestId('code-diff')).toHaveAttribute(
			'data-new',
			// Both sides get a final newline, so an unchanged last line does not show as changed.
			`${to.instructions}\n`,
		);
		expect(within(sections[2]).getByTestId('code-diff').getAttribute('data-old')).toMatch(/\n$/);
		expect(within(sections[0]).queryByTestId('code-diff')).not.toBeInTheDocument();
		expect(getByTestId('skill-version-diff-stat')).toHaveTextContent('+2 −0');
		expect(getByTestId('skill-version-diff-from')).toHaveTextContent('v3');
		expect(getByTestId('skill-version-diff-to')).toHaveTextContent('v4');
	});

	it('says the content is the same when nothing changed', () => {
		const { getByTestId, queryAllByTestId } = renderComponent({ props: { from, to: from } });

		expect(getByTestId('skill-version-diff-stat')).toHaveTextContent('Same content');
		expect(queryAllByTestId('code-diff')).toHaveLength(0);
	});
});
