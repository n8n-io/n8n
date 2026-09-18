import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';

import RestrictedNodePanel from './RestrictedNodePanel.vue';

const renderComponent = createComponentRenderer(RestrictedNodePanel, {
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

describe('RestrictedNodePanel', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('names the node type and the blocking scope', () => {
		const { getByTestId } = renderComponent({ props: { scope: 'instance' } });

		expect(getByTestId('node-restricted-panel')).toHaveTextContent(
			"An administrator blocked 'Slack' on this instance. Contact an instance admin or replace the node to continue.",
		);
	});

	it('renders a missing scope generically', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('node-restricted-panel')).toHaveTextContent(
			"An administrator blocked 'Slack'. Contact",
		);
	});

	it('opens the contact-admin dialog for this node type', async () => {
		const { getByTestId, queryByTestId } = renderComponent();

		expect(queryByTestId('contact-instance-admin-modal')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('node-restricted-contact-admin'));

		expect(getByTestId('contact-instance-admin-modal')).toHaveTextContent('Slack');
	});

	it('emits replaceNode from the replace action', async () => {
		const { getByTestId, emitted } = renderComponent();

		await fireEvent.click(getByTestId('node-restricted-replace'));

		expect(emitted('replaceNode')).toHaveLength(1);
	});
});
