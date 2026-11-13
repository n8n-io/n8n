import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';

import RestrictedTypeCallout from './RestrictedTypeCallout.vue';
import type { OptionalVerdict } from '../composables/useNodeTypeRestriction';
import { contactAdminModalStub, mockPolicyProject } from '../__tests__/mocks';

const renderCallout = createComponentRenderer(RestrictedTypeCallout, {
	global: {
		stubs: {
			ContactAdminModal: contactAdminModalStub,
		},
	},
});

const renderTool = (restriction?: OptionalVerdict) =>
	renderCallout({ props: { surface: 'tool', typeName: 'Slack', restriction } });

const renderCredential = (restriction?: OptionalVerdict) =>
	renderCallout({ props: { surface: 'credential', typeName: 'OpenAI', restriction } });

describe('RestrictedTypeCallout', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	describe('tool surface', () => {
		it('names the tool and the blocking scope', () => {
			const { getByTestId } = renderTool({ scope: 'instance' });

			expect(getByTestId('restricted-tool-callout')).toHaveTextContent(
				"Slack is restricted on this instance. The agent can't use it.",
			);
		});

		it('renders a missing scope generically', () => {
			const { getByTestId } = renderTool();

			expect(getByTestId('restricted-tool-callout')).toHaveTextContent(
				"Slack is restricted. The agent can't use it.",
			);
		});

		it('opens the contact-admin dialog for this tool', async () => {
			const { getByTestId, queryByTestId } = renderTool();

			expect(queryByTestId('contact-admin-modal')).not.toBeInTheDocument();
			await fireEvent.click(getByTestId('restricted-tool-contact-admin'));

			expect(getByTestId('contact-admin-modal')).toHaveTextContent('Slack');
		});

		it('sends a project restriction to the project admins', async () => {
			mockPolicyProject({ type: 'team' });
			const { getByTestId } = renderTool({ scope: 'project' });

			expect(getByTestId('restricted-tool-contact-admin')).toHaveTextContent(
				'Contact project admin',
			);
			await fireEvent.click(getByTestId('restricted-tool-contact-admin'));
			expect(getByTestId('contact-admin-modal')).toHaveAttribute('data-audience', 'project');
		});

		it('says a project admin can allow a delegated tool', () => {
			mockPolicyProject({ type: 'team' });
			const { getByTestId } = renderTool({ scope: 'instance', optInAvailable: true });

			expect(getByTestId('restricted-tool-callout')).toHaveTextContent(
				"Slack needs approval in this project. The agent can't use it until a project admin allows it.",
			);
		});
	});

	describe('credential surface', () => {
		it('names the credential type and the blocking scope', () => {
			const { getByTestId } = renderCredential({ scope: 'instance' });

			expect(getByTestId('restricted-credential-callout')).toHaveTextContent(
				"OpenAI credentials are restricted on this instance. Workflows can't use them.",
			);
		});

		it('opens the contact dialog for the credential kind and the blocking audience', async () => {
			mockPolicyProject({ type: 'team' });
			const { getByTestId } = renderCredential({ scope: 'project' });

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
});
