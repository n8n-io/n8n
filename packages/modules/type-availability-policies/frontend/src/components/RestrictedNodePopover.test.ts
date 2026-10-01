import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';

import RestrictedNodePopover from './RestrictedNodePopover.vue';

const DESCRIPTION =
	'An administrator blocked this node. To use it in your workflows, contact an instance administrator for access.';

const renderComponent = createComponentRenderer(RestrictedNodePopover, {
	props: { nodeTypeName: 'Gmail', scope: 'instance' },
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

const renderPopover = (props: Record<string, unknown>) => renderComponent({ props });

describe('RestrictedNodePopover', () => {
	/** The list row the popover anchors to. It lives outside the rendered component. */
	let anchor: HTMLDivElement;

	beforeEach(() => {
		anchor = document.createElement('div');
		document.body.appendChild(anchor);
	});

	afterEach(() => {
		anchor.remove();
	});

	it('renders only the lock while the row is neither hovered nor active', () => {
		renderPopover({ active: false });

		expect(screen.getByTestId('node-restricted-icon')).toBeInTheDocument();
		expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument();
	});

	it('opens for the keyboard-active row and names the node and the instance scope', async () => {
		renderPopover({ active: true });

		expect(await screen.findByTestId('node-restricted-popover')).toBeInTheDocument();
		expect(screen.getByText('Gmail')).toBeInTheDocument();
		expect(screen.getByText('Restricted on this instance')).toBeInTheDocument();
		expect(screen.getByText(DESCRIPTION)).toBeInTheDocument();
	});

	it('names the project scope', async () => {
		renderPopover({ active: true, scope: 'project' });

		expect(await screen.findByText('Restricted in this project')).toBeInTheDocument();
	});

	it('falls back to the generic title for an unknown scope', async () => {
		renderPopover({ active: true, scope: undefined });

		expect(await screen.findByText('This node is restricted')).toBeInTheDocument();
	});

	it('opens when the anchor row is hovered and stays open while the pointer is on the popover', async () => {
		renderPopover({ anchor });

		await userEvent.hover(anchor);
		const popover = await screen.findByTestId('node-restricted-popover');
		await userEvent.hover(popover);
		await userEvent.unhover(anchor);

		expect(screen.getByTestId('node-restricted-popover')).toBeInTheDocument();
	});

	it('opens while focus is inside the anchor row and closes when focus leaves', async () => {
		const button = document.createElement('button');
		anchor.appendChild(button);
		renderPopover({ anchor });

		button.focus();
		expect(await screen.findByTestId('node-restricted-popover')).toBeInTheDocument();

		button.blur();
		await waitFor(() =>
			expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument(),
		);
	});

	it('closes while the contact-admin dialog is open', async () => {
		renderPopover({ active: true });

		await userEvent.click(await screen.findByTestId('node-restricted-contact-admin'));

		await waitFor(() =>
			expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument(),
		);
		expect(screen.getByTestId('contact-instance-admin-modal')).toBeInTheDocument();
	});

	it('opens the contact-admin dialog for this node type', async () => {
		renderPopover({ active: true });
		expect(screen.queryByTestId('contact-instance-admin-modal')).not.toBeInTheDocument();

		await userEvent.click(await screen.findByTestId('node-restricted-contact-admin'));

		expect(screen.getByTestId('contact-instance-admin-modal')).toHaveTextContent('Gmail');
	});

	it('keeps the dialog open after the pointer leaves the row and the popover', async () => {
		renderPopover({ anchor });

		await userEvent.hover(anchor);
		const popover = await screen.findByTestId('node-restricted-popover');
		await userEvent.click(screen.getByTestId('node-restricted-contact-admin'));
		await userEvent.unhover(popover);
		await userEvent.unhover(anchor);
		await waitFor(() =>
			expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument(),
		);

		expect(screen.getByTestId('contact-instance-admin-modal')).toHaveTextContent('Gmail');
	});
});
