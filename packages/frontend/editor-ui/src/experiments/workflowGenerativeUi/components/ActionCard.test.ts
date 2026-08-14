import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent } from '@testing-library/vue';
import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { GenerativeUiLookOnlyKey } from '../nodeLookup';
import ActionCard from './ActionCard.vue';
import Step from './Step.vue';

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

		expect(queryByRole('button')).not.toBeInTheDocument();

		await fireEvent.click(container.firstElementChild as Element);

		expect(emitted().press).toBeUndefined();
	});

	it('has no interactive behavior without a node ID', async () => {
		const { container, emitted, queryByRole } = renderComponent({ props: { nodeId: null } });

		expect(queryByRole('button')).not.toBeInTheDocument();
		await fireEvent.click(container.firstElementChild as Element);

		expect(emitted().press).toBeUndefined();
	});

	it('has no interactive behavior without a press binding', async () => {
		const { emitted, queryByRole } = renderComponent({ props: { pressBound: false } });

		expect(queryByRole('button')).not.toBeInTheDocument();
		expect(emitted().press).toBeUndefined();
	});

	it('renders the label, title, node brand, and slot content', () => {
		const { container, getByTestId, getByText } = renderComponent({
			slots: { default: '<p>Sends the summary</p>' },
		});

		expect(getByTestId('generic-action-card')).toBeInTheDocument();
		expect(getByText('Action')).toBeInTheDocument();
		expect(getByText('Send email')).toBeInTheDocument();
		expect(getByText('Sends the summary')).toBeInTheDocument();
		expect(container.querySelector('node-brand-stub')).not.toBeNull();
	});

	it('stays quiet and motionless', () => {
		const { container, getByTestId } = renderComponent();
		const card = getByTestId('generic-action-card');

		expect(card).not.toHaveAttribute('data-motion');
		expect(card).not.toHaveAttribute('data-emphasis');
		expect(card).not.toHaveAttribute('data-tone');
		expect(container.querySelector('[data-motion]')).toBeNull();

		const source = readFileSync(resolve(__dirname, 'ActionCard.vue'), 'utf8');
		expect(source).not.toMatch(/@keyframes|animation|transition|\bmotion\b/);
	});

	it('remains the fallback shell for a generic Step', () => {
		const renderStep = createComponentRenderer(Step, {
			props: {
				nodeId: 'node-1',
				title: 'Prepare payload',
				summary: 'Shapes the data for the next call',
				pressBound: true,
			},
			global: { stubs: { NodeBrand: true } },
		});
		const { getByTestId, getByText } = renderStep();

		expect(getByTestId('generic-action-card')).toBeInTheDocument();
		expect(getByText('Shapes the data for the next call')).toBeInTheDocument();
	});
});
