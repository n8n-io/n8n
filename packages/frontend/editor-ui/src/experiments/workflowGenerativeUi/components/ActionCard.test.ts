import { fireEvent } from '@testing-library/vue';
import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { GenerativeUiLookOnlyKey } from '../nodeLookup';
import ActionCard from './ActionCard.vue';

const renderComponent = createComponentRenderer(ActionCard, {
	props: {
		nodeId: 'node-1',
		label: 'Action',
		title: 'Send email',
		pressBound: true,
	},
	global: {
		stubs: {
			NodeBrand: true,
		},
	},
});

function getCard(container: Element) {
	const card = container.firstElementChild;
	if (!card) throw new Error('Action card was not rendered');
	return card;
}

describe('ActionCard', () => {
	it('emits press for click, Enter, and Space when interactive', async () => {
		const { emitted, getByRole } = renderComponent();
		const card = getByRole('button');

		expect(card).toHaveAttribute('tabindex', '0');

		await fireEvent.click(card);
		await fireEvent.keyDown(card, { key: 'Enter' });
		await fireEvent.keyDown(card, { key: ' ' });

		expect(emitted().press).toHaveLength(3);
	});

	it('has no interactive behavior in look-only state', async () => {
		const { container, emitted, queryByRole } = renderComponent({
			global: {
				provide: {
					[GenerativeUiLookOnlyKey]: ref(true),
				},
			},
		});
		const card = getCard(container);

		expect(queryByRole('button')).not.toBeInTheDocument();
		expect(card).not.toHaveAttribute('tabindex');

		await fireEvent.click(card);
		await fireEvent.keyDown(card, { key: 'Enter' });
		await fireEvent.keyDown(card, { key: ' ' });

		expect(emitted().press).toBeUndefined();
	});

	it('does not emit press without a node ID', async () => {
		const { container, emitted, queryByRole } = renderComponent({
			props: { nodeId: null },
		});
		const card = getCard(container);

		expect(queryByRole('button')).not.toBeInTheDocument();
		await fireEvent.click(card);

		expect(emitted().press).toBeUndefined();
	});

	it('has no interactive behavior without a press binding', async () => {
		const { container, emitted, queryByRole } = renderComponent({
			props: { pressBound: false },
		});
		const card = getCard(container);

		expect(queryByRole('button')).not.toBeInTheDocument();
		expect(card).not.toHaveAttribute('tabindex');
		await fireEvent.click(card);

		expect(emitted().press).toBeUndefined();
	});
});
