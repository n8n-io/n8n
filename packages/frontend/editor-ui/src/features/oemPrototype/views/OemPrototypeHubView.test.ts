import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import OemPrototypeHubView from './OemPrototypeHubView.vue';

const renderComponent = createComponentRenderer(OemPrototypeHubView, {
	global: {
		stubs: {
			RouterLink: {
				props: ['to'],
				template: '<a data-test-id="prototype-link"><slot /></a>',
			},
		},
	},
});

describe('OemPrototypeHubView', () => {
	it('should open prototypes in the same tab and Linear tickets in new tabs', () => {
		const { getAllByTestId, getByRole } = renderComponent();

		for (const prototypeLink of getAllByTestId('prototype-link')) {
			expect(prototypeLink).not.toHaveAttribute('target');
		}

		for (const ticket of ['API-317', 'API-305']) {
			expect(getByRole('link', { name: ticket })).toHaveAttribute('target', '_blank');
			expect(getByRole('link', { name: ticket })).toHaveAttribute('rel', 'noopener noreferrer');
		}
	});
});
