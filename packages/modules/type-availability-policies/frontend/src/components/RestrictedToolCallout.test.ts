import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';

import RestrictedToolCallout from './RestrictedToolCallout.vue';
import { contactAdminModalStub, mockPolicyProject } from '../__tests__/mocks';

const renderComponent = createComponentRenderer(RestrictedToolCallout, {
	props: { nodeTypeName: 'Slack' },
	global: {
		stubs: {
			ContactAdminModal: contactAdminModalStub,
		},
	},
});

describe('RestrictedToolCallout', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('names the tool and the blocking scope', () => {
		const { getByTestId } = renderComponent({ props: { restriction: { scope: 'instance' } } });

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

		expect(queryByTestId('contact-admin-modal')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('restricted-tool-contact-admin'));

		expect(getByTestId('contact-admin-modal')).toHaveTextContent('Slack');
	});

	it('sends a project restriction to the project admins', async () => {
		mockPolicyProject({ type: 'team' });
		const { getByTestId } = renderComponent({ props: { restriction: { scope: 'project' } } });

		expect(getByTestId('restricted-tool-contact-admin')).toHaveTextContent('Contact project admin');
		await fireEvent.click(getByTestId('restricted-tool-contact-admin'));
		expect(getByTestId('contact-admin-modal')).toHaveAttribute('data-audience', 'project');
	});

	it('says a project admin can allow a delegated tool', () => {
		mockPolicyProject({ type: 'team' });
		const { getByTestId } = renderComponent({
			props: { restriction: { scope: 'instance', optInAvailable: true } },
		});

		expect(getByTestId('restricted-tool-callout')).toHaveTextContent(
			"Slack needs approval in this project. The agent can't use it until a project admin allows it.",
		);
	});
});
