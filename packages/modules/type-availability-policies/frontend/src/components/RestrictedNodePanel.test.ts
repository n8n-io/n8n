import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';

import RestrictedNodePanel from './RestrictedNodePanel.vue';
import { contactAdminModalStub, mockPolicyProject } from '../__tests__/mocks';

const renderComponent = createComponentRenderer(RestrictedNodePanel, {
	props: { nodeTypeName: 'Slack' },
	global: {
		stubs: {
			ContactAdminModal: contactAdminModalStub,
		},
	},
});

describe('RestrictedNodePanel', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('names the node type and the blocking scope', () => {
		const { getByTestId } = renderComponent({ props: { restriction: { scope: 'instance' } } });

		expect(getByTestId('node-restricted-panel')).toHaveTextContent(
			"An administrator blocked 'Slack' on this instance. Contact an instance admin or replace the node to continue.",
		);
	});

	it('renders a missing scope generically', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('node-restricted-panel')).toHaveTextContent(
			"An administrator blocked 'Slack'. Contact an instance admin or replace the node to continue.",
		);
	});

	it('hides the replace action and drops it from the copy', () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: { showReplace: false } });

		expect(queryByTestId('node-restricted-replace')).not.toBeInTheDocument();
		expect(getByTestId('node-restricted-panel')).toHaveTextContent(
			"An administrator blocked 'Slack'. Contact an instance admin to continue.",
		);
	});

	it('opens the contact-admin dialog for this node type', async () => {
		const { getByTestId, queryByTestId } = renderComponent();

		expect(queryByTestId('contact-admin-modal')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('node-restricted-contact-admin'));

		expect(getByTestId('contact-admin-modal')).toHaveTextContent('Slack');
	});

	it('emits replaceNode from the replace action', async () => {
		const { getByTestId, emitted } = renderComponent();

		await fireEvent.click(getByTestId('node-restricted-replace'));

		expect(emitted('replaceNode')).toHaveLength(1);
	});

	it('sends a project restriction to the project admins', async () => {
		mockPolicyProject({ type: 'team' });
		const { getByTestId } = renderComponent({ props: { restriction: { scope: 'project' } } });

		expect(getByTestId('node-restricted-panel')).toHaveTextContent(
			"An administrator blocked 'Slack' in this project. Contact a project admin or replace the node to continue.",
		);
		expect(getByTestId('node-restricted-contact-admin')).toHaveTextContent('Contact project admin');
		await fireEvent.click(getByTestId('node-restricted-contact-admin'));
		expect(getByTestId('contact-admin-modal')).toHaveAttribute('data-audience', 'project');
	});

	it('says a project admin can allow a delegated node', () => {
		mockPolicyProject({ type: 'team' });
		const { getByTestId } = renderComponent({
			props: { restriction: { scope: 'instance', optInAvailable: true } },
		});

		expect(getByTestId('node-restricted-panel')).toHaveTextContent(
			'A project admin can allow it for this project. Contact one or replace the node to continue.',
		);
		expect(getByTestId('node-restricted-contact-admin')).toHaveTextContent('Contact project admin');
	});

	it('keeps the instance admin for a project restriction in a personal project', () => {
		mockPolicyProject({ type: 'personal' });
		const { getByTestId } = renderComponent({ props: { restriction: { scope: 'project' } } });

		expect(getByTestId('node-restricted-contact-admin')).toHaveTextContent(
			'Contact instance admin',
		);
	});
});
