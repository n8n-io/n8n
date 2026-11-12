import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';

import RestrictedTemplateNodesCallout from './RestrictedTemplateNodesCallout.vue';
import type { RestrictedNodeTypeName } from '../composables/useNodeTypeRestriction';
import { contactAdminModalStub, mockPolicyProject } from '../__tests__/mocks';

const renderCallout = createComponentRenderer(RestrictedTemplateNodesCallout, {
	global: {
		stubs: {
			ContactAdminModal: contactAdminModalStub,
		},
	},
});

const render = (restricted: RestrictedNodeTypeName[]) => renderCallout({ props: { restricted } });

describe('RestrictedTemplateNodesCallout', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('names one restricted node and tells the user to replace it', () => {
		const { getByTestId } = render([{ displayName: 'Gmail Trigger', scope: 'instance' }]);

		expect(getByTestId('restricted-template-nodes-callout')).toHaveTextContent(
			'Gmail Trigger is restricted on this instance. Replace it after you use the template.',
		);
		expect(getByTestId('restricted-template-nodes-contact-admin')).toHaveTextContent(
			'Contact instance admin',
		);
	});

	it('names several restricted nodes with one line for each scope', () => {
		mockPolicyProject({ type: 'team' });
		const { getByTestId } = render([
			{ displayName: 'Gmail Trigger', scope: 'instance' },
			{ displayName: 'Slack', scope: 'project' },
		]);

		const callout = getByTestId('restricted-template-nodes-callout');
		expect(callout).toHaveTextContent('An administrator blocked these nodes:');
		expect(callout).toHaveTextContent("Restricted on this instance: 'Gmail Trigger'.");
		expect(callout).toHaveTextContent("Restricted in this project: 'Slack'.");
		expect(callout).toHaveTextContent('Replace these nodes after you use the template.');
		expect(callout).not.toHaveTextContent('to continue');
	});

	it('opens the contact dialog for every restricted node', async () => {
		const { getByTestId, queryByTestId } = render([
			{ displayName: 'Gmail Trigger', scope: 'instance' },
			{ displayName: 'Slack', scope: 'instance' },
		]);

		expect(queryByTestId('contact-admin-modal')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('restricted-template-nodes-contact-admin'));

		const dialog = getByTestId('contact-admin-modal');
		expect(dialog).toHaveAttribute('data-audience', 'instance');
		expect(dialog).toHaveTextContent('Gmail Trigger');
		expect(dialog).toHaveTextContent('Slack');
	});

	it('sends a project restriction to the project admins', () => {
		mockPolicyProject({ type: 'team' });
		const { getByTestId } = render([{ displayName: 'Slack', scope: 'project' }]);

		expect(getByTestId('restricted-template-nodes-callout')).toHaveTextContent(
			'Slack is restricted in this project. Replace it after you use the template.',
		);
		expect(getByTestId('restricted-template-nodes-contact-admin')).toHaveTextContent(
			'Contact project admin',
		);
	});
});
