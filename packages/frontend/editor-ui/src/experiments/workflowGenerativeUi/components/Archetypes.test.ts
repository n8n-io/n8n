import { screen, within } from '@testing-library/vue';
import { h } from 'vue';
import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import AdaptiveStoryboard from './AdaptiveStoryboard.vue';
import GuidedTimeline from './GuidedTimeline.vue';
import OutcomeBoard from './OutcomeBoard.vue';

const sections = {
	default: () => [
		h('section', { 'data-test-id': 'first-section' }, 'First'),
		h('section', { 'data-test-id': 'second-section' }, 'Second'),
		h('section', { 'data-test-id': 'third-section' }, 'Third'),
	],
};

const renderStoryboard = createComponentRenderer(AdaptiveStoryboard, { slots: sections });
const renderBoard = createComponentRenderer(OutcomeBoard, { slots: sections });
const renderTimeline = createComponentRenderer(GuidedTimeline, { slots: sections });

const cases = [
	['adaptive storyboard', renderStoryboard, 'storyboard-chapter'],
	['outcome board', renderBoard, 'outcome-panel'],
	['guided timeline', renderTimeline, 'timeline-stop'],
] as const;

describe.each(cases)('%s', (label, renderComponent, sectionTestId) => {
	it('gives every workflow section its own shell, in order', () => {
		renderComponent();

		const region = screen.getByRole('region', { name: new RegExp(label, 'i') });
		const shells = within(region).getAllByTestId(sectionTestId);

		expect(shells).toHaveLength(3);
		expect(shells[0]).toContainElement(screen.getByTestId('first-section'));
		expect(shells[1]).toContainElement(screen.getByTestId('second-section'));
		expect(shells[2]).toContainElement(screen.getByTestId('third-section'));
	});
});

describe('archetype macro layouts', () => {
	it('composes the storyboard as editorial chapters without a numbered rail', () => {
		renderStoryboard();

		const region = screen.getByRole('region', { name: /adaptive storyboard/i });

		expect(within(region).getAllByTestId('storyboard-chapter')).toHaveLength(3);
		expect(within(region).queryAllByTestId('timeline-stop')).toHaveLength(0);
		expect(within(region).queryAllByTestId('archetype-ordinal')).toHaveLength(0);
	});

	it('composes the outcome board as unnumbered outcome panels', () => {
		renderBoard();

		const region = screen.getByRole('region', { name: /outcome board/i });

		expect(within(region).getAllByTestId('outcome-panel')).toHaveLength(3);
		expect(within(region).queryAllByTestId('timeline-stop')).toHaveLength(0);
		expect(within(region).queryAllByTestId('archetype-ordinal')).toHaveLength(0);
	});

	it('composes the guided timeline as an ordered rail of numbered stops', () => {
		renderTimeline();

		const region = screen.getByRole('region', { name: /guided timeline/i });
		const stops = within(region).getAllByRole('listitem');

		expect(stops).toHaveLength(3);
		expect(
			within(region)
				.getAllByTestId('archetype-ordinal')
				.map((ordinal) => ordinal.textContent),
		).toEqual(['01', '02', '03']);
	});
});
