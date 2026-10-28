import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import PreferencesEmptyStateExamples from './PreferencesEmptyStateExamples.vue';

const renderComponent = createComponentRenderer(PreferencesEmptyStateExamples);

describe('PreferencesEmptyStateExamples', () => {
	it('shows the four example cards with the scope hint', () => {
		const { getAllByTestId, getByTestId } = renderComponent();

		expect(getAllByTestId('preferences-example-use-button')).toHaveLength(4);
		for (const id of ['workflows', 'agents', 'credentials', 'answers']) {
			expect(within(getByTestId(`preferences-example-${id}`)).getByText('Just you')).toBeVisible();
		}
	});

	it('emits the example of the card whose "Use example" was selected', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(
			within(getByTestId('preferences-example-agents')).getByTestId(
				'preferences-example-use-button',
			),
		);

		expect(emitted('use-example')).toEqual([
			[
				{
					id: 'agents',
					content:
						'Make each agent ask for my approval before it sends a message or changes data in another app.',
				},
			],
		]);
	});

	it('emits write-own from "Write your own"', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('preferences-empty-state-write-own'));

		expect(emitted('write-own')).toHaveLength(1);
		expect(emitted('use-example')).toBeUndefined();
	});
});
