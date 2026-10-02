import { describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalExamplesSlider from '../components/AgentEvalExamplesSlider.vue';

const examples = [
	{
		input: 'Which ticket is blocking the release?',
		whatToCheck: 'names a ticket',
		scenario: 'Vague',
	},
	{ input: 'What is our refund policy?', whatToCheck: 'mentions 30 days', scenario: 'Happy path' },
];

const renderComponent = createComponentRenderer(AgentEvalExamplesSlider, {
	props: { examples },
});

describe('AgentEvalExamplesSlider', () => {
	it('renders the slider and generated examples by default', () => {
		const { getByTestId, getAllByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('instance-ai-test-agent-examples-slider')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(2);
		expect(queryByTestId('agent-eval-examples-slider-loading')).not.toBeInTheDocument();
	});

	it('shows a spinner saying cases are being generated, instead of the slider/list/input', () => {
		const { getByTestId, getByText, queryByTestId } = renderComponent({
			props: { loading: true, examples: [] },
		});

		expect(getByTestId('agent-eval-examples-slider-loading')).toBeInTheDocument();
		expect(getByText('Generating cases to your eval suite…')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-slider')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-add-own-input')).not.toBeInTheDocument();
	});

	it('shows the "add your own" row styled like a try row, with a "Custom" label and placeholder', () => {
		const { getByTestId, getByText } = renderComponent();

		expect(getByText('Custom')).toBeInTheDocument();
		expect(getByTestId('instance-ai-test-agent-examples-add-own-input')).toHaveAttribute(
			'placeholder',
			'Type a message it should handle, then Enter',
		);
	});

	it('labels a submitted own example as "Custom", same as the other rows', async () => {
		const user = userEvent.setup();
		const { getByTestId, getAllByText } = renderComponent();

		await user.type(
			getByTestId('instance-ai-test-agent-examples-add-own-input'),
			'My own example{Enter}',
		);

		expect(getByTestId('instance-ai-test-agent-examples-own-example')).toBeInTheDocument();
		// One "Custom" label on the input row, one on the newly submitted row.
		expect(getAllByText('Custom')).toHaveLength(2);
	});

	it('puts a newly submitted own example above the generated ones', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderComponent();

		await user.type(
			getByTestId('instance-ai-test-agent-examples-add-own-input'),
			'My own example{Enter}',
		);

		// First child of the list, not last — "on top" of the generated rows.
		expect(
			getByTestId('instance-ai-test-agent-examples-own-example').previousElementSibling,
		).toBeNull();
	});

	it('picks up the real batch once it lands, instead of staying stuck at 1 from the pre-generation mount', async () => {
		// Both callers mount this while generation is still in flight — `loading:
		// true` and `examples: []` — then swap in the real batch once it
		// resolves. `maxSliderValue`/`sliderValue` used to be computed once at
		// setup from that initial (empty) `examples`, so they'd stay pinned at 1
		// forever, leaving the slider with no range to drag (and El Slider
		// computing `0/0` → NaN on any attempt to move it).
		const fiveExamples = [
			{ input: 'case 1', whatToCheck: 'check 1', scenario: 'Vague' },
			{ input: 'case 2', whatToCheck: 'check 2', scenario: 'Upset' },
			{ input: 'case 3', whatToCheck: 'check 3', scenario: 'Off-topic' },
			{ input: 'case 4', whatToCheck: 'check 4', scenario: 'Sensitive data' },
			{ input: 'case 5', whatToCheck: 'check 5', scenario: 'Happy path' },
		];
		const { rerender, getByText, getByRole, getAllByTestId } = renderComponent({
			props: { loading: true, examples: [] },
		});

		await rerender({ loading: false, examples: fiveExamples });

		// Defaults to 2, not stuck at the pre-generation 1.
		expect(getByText('2 checks')).toBeInTheDocument();
		const slider = getByRole('slider');
		expect(slider).toHaveAttribute('aria-valuemax', '5');

		// The range is real (1..5), not collapsed to 1..1 — dragging moves it.
		slider.focus();
		await fireEvent.keyDown(slider, { key: 'ArrowRight' });
		expect(getByText('3 checks')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(3);
	});

	describe('collapsing past 3 examples', () => {
		const manyExamples = [
			{ input: 'case 1', whatToCheck: 'check 1', scenario: 'Vague' },
			{ input: 'case 2', whatToCheck: 'check 2', scenario: 'Upset' },
			{ input: 'case 3', whatToCheck: 'check 3', scenario: 'Off-topic' },
			{ input: 'case 4', whatToCheck: 'check 4', scenario: 'Sensitive data' },
			{ input: 'case 5', whatToCheck: 'check 5', scenario: 'Happy path' },
		];

		const renderMany = createComponentRenderer(AgentEvalExamplesSlider, {
			props: { examples: manyExamples },
		});

		async function growSliderTo(target: number, getByRole: () => HTMLElement) {
			const slider = getByRole();
			slider.focus();
			for (let value = 2; value < target; value++) {
				await fireEvent.keyDown(slider, { key: 'ArrowRight' });
			}
		}

		it('shows the most recently revealed example first, not tacked onto the bottom', async () => {
			const { getByRole, getAllByTestId } = renderMany();

			await growSliderTo(3, () => getByRole('slider'));

			const rows = getAllByTestId('instance-ai-test-agent-examples-example');
			expect(rows).toHaveLength(3);
			expect(rows[0]).toHaveTextContent('case 3');
			expect(rows[2]).toHaveTextContent('case 1');
		});

		it('shows no toggle when 3 or fewer examples are visible', () => {
			const { queryByTestId } = createComponentRenderer(AgentEvalExamplesSlider, {
				props: { examples: manyExamples.slice(0, 3) },
			})();

			expect(queryByTestId('instance-ai-test-agent-examples-toggle-more')).not.toBeInTheDocument();
		});

		it('collapses to 3 rows with a "+N more" toggle once the slider grows past 3', async () => {
			const { getByRole, getAllByTestId, getByTestId } = renderMany();

			await growSliderTo(4, () => getByRole('slider'));

			expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(3);
			expect(getByTestId('instance-ai-test-agent-examples-toggle-more')).toHaveTextContent(
				'+1 more',
			);
		});

		it('expands to show every row on click, then collapses again on a second click', async () => {
			const user = userEvent.setup();
			const { getByRole, getAllByTestId, getByTestId } = renderMany();
			await growSliderTo(4, () => getByRole('slider'));

			await user.click(getByTestId('instance-ai-test-agent-examples-toggle-more'));

			expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(4);
			expect(getByTestId('instance-ai-test-agent-examples-toggle-more')).toHaveTextContent(
				'Show fewer',
			);

			await user.click(getByTestId('instance-ai-test-agent-examples-toggle-more'));

			expect(getAllByTestId('instance-ai-test-agent-examples-example')).toHaveLength(3);
			expect(getByTestId('instance-ai-test-agent-examples-toggle-more')).toHaveTextContent(
				'+1 more',
			);
		});
	});
});
