import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';

import ContactInstanceAdminButton from './ContactInstanceAdminButton.vue';

const renderComponent = createComponentRenderer(ContactInstanceAdminButton, {
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

describe('ContactInstanceAdminButton', () => {
	it('labels the action and keeps the dialog closed', () => {
		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('node-restricted-contact-admin')).toHaveTextContent(
			'Contact instance admin',
		);
		expect(queryByTestId('contact-instance-admin-modal')).not.toBeInTheDocument();
	});

	it('opens the contact-admin dialog for this node type', async () => {
		const { getByTestId } = renderComponent();

		await fireEvent.click(getByTestId('node-restricted-contact-admin'));

		expect(getByTestId('contact-instance-admin-modal')).toHaveTextContent('Slack');
	});

	it('renders the suffix slot inside the button', () => {
		const { getByTestId } = renderComponent({
			slots: { suffix: '<span data-test-id="suffix-slot" />' },
		});

		expect(getByTestId('node-restricted-contact-admin')).toContainElement(
			getByTestId('suffix-slot'),
		);
	});
});
