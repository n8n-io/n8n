import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';

import RestrictedCredentialCallout from './RestrictedCredentialCallout.vue';
import { contactAdminModalStub, mockPolicyProject } from '../__tests__/mocks';

const renderComponent = createComponentRenderer(RestrictedCredentialCallout, {
	props: { credentialTypeName: 'OpenAI' },
	global: {
		stubs: {
			ContactAdminModal: contactAdminModalStub,
		},
	},
});

describe('RestrictedCredentialCallout', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('names the credential type and the blocking scope', () => {
		const { getByTestId } = renderComponent({ props: { restriction: { scope: 'instance' } } });

		expect(getByTestId('restricted-credential-callout')).toHaveTextContent(
			"OpenAI credentials are restricted on this instance. Workflows can't use them.",
		);
	});

	it('opens the contact dialog for the credential kind and the blocking audience', async () => {
		mockPolicyProject({ type: 'team' });
		const { getByTestId } = renderComponent({ props: { restriction: { scope: 'project' } } });

		expect(getByTestId('restricted-credential-contact-admin')).toHaveTextContent(
			'Contact project admin',
		);
		await fireEvent.click(getByTestId('restricted-credential-contact-admin'));

		const dialog = getByTestId('contact-admin-modal');
		expect(dialog).toHaveAttribute('data-kind', 'credential');
		expect(dialog).toHaveAttribute('data-audience', 'project');
		expect(dialog).toHaveTextContent('OpenAI');
	});
});
