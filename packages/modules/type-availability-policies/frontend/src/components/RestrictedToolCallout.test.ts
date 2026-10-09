import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';

import RestrictedToolCallout from './RestrictedToolCallout.vue';

const renderComponent = createComponentRenderer(RestrictedToolCallout, {
	props: { nodeTypeName: 'Slack' },
	global: {
		stubs: {
			ContactInstanceAdminModal: {
				props: ['open', 'nodeTypeName'],
				template:
					'<div v-if="open" data-test-id="contact-instance-admin-modal">{{ nodeTypeName }}</div>',
			},
		},
	},
});

describe('RestrictedToolCallout', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('names the tool and the blocking scope', () => {
		const { getByTestId } = renderComponent({ props: { scope: 'instance' } });

		expect(getByTestId('restricted-tool-callout')).toHaveTextContent(
			"Slack is restricted on this instance. The agent can't use it.",
		);
	});

	it('renders a missing scope generically', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('restricted-tool-callout')).toHaveTextContent(
			"Slack is restricted. The agent can't use it.",
		);
	});

	it('opens the contact-admin dialog for this tool', async () => {
		const { getByTestId, queryByTestId } = renderComponent();

		expect(queryByTestId('contact-instance-admin-modal')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('restricted-tool-contact-admin'));

		expect(getByTestId('contact-instance-admin-modal')).toHaveTextContent('Slack');
	});
});
