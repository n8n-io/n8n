import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { screen, waitFor } from '@testing-library/vue';
import userEvent, { PointerEventsCheckLevel, type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

import RestrictedNodePopover from './RestrictedNodePopover.vue';
import { contactAdminModalStub, mockPolicyProject } from '../__tests__/mocks';

const DESCRIPTION =
	'An administrator blocked this node. To use it in your workflows, contact an instance administrator for access.';

const renderComponent = createComponentRenderer(RestrictedNodePopover, {
	props: { nodeTypeName: 'Gmail', restriction: { scope: 'instance' } },
	global: {
		stubs: {
			ContactAdminModal: contactAdminModalStub,
		},
	},
});

const renderPopover = (props: Record<string, unknown>) => renderComponent({ props });

describe('RestrictedNodePopover', () => {
	/** The list row the popover anchors to. It lives outside the rendered component. */
	let anchor: HTMLDivElement;
	let user: UserEvent;

	beforeEach(() => {
		// jsdom has no layout, so a row has no box and the card hides without pointer events.
		user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
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

	it('places the popover where the host asks', async () => {
		renderPopover({ active: true, side: 'top', align: 'end' });

		const content = (await screen.findByTestId('node-restricted-popover')).closest('[data-side]');
		expect(content).toHaveAttribute('data-side', 'top');
		expect(content).toHaveAttribute('data-align', 'end');
	});

	it('names the project scope', async () => {
		renderPopover({ active: true, restriction: { scope: 'project' } });

		expect(await screen.findByText('Restricted in this project')).toBeInTheDocument();
	});

	it('falls back to the generic title for an unknown scope', async () => {
		renderPopover({ active: true, restriction: undefined });

		expect(await screen.findByText('This node is restricted')).toBeInTheDocument();
	});

	it('opens when the anchor row is hovered and stays open while the pointer is on the popover', async () => {
		renderPopover({ anchor });

		await user.hover(anchor);
		const popover = await screen.findByTestId('node-restricted-popover');
		await user.hover(popover);
		await user.unhover(anchor);

		expect(screen.getByTestId('node-restricted-popover')).toBeInTheDocument();
	});

	it('closes at once when the pointer moves to another restricted row', async () => {
		const otherAnchor = document.createElement('div');
		document.body.appendChild(otherAnchor);
		renderPopover({ anchor, nodeTypeName: 'Gmail' });
		renderPopover({ anchor: otherAnchor, nodeTypeName: 'Slack' });

		await user.hover(anchor);
		expect(await screen.findByText('Gmail')).toBeInTheDocument();

		await user.hover(otherAnchor);
		expect(await screen.findByText('Slack')).toBeInTheDocument();
		expect(screen.queryByText('Gmail')).not.toBeInTheDocument();

		otherAnchor.remove();
	});

	it('opens again when the pointer comes back to a row before its leave grace ends', async () => {
		const otherAnchor = document.createElement('div');
		document.body.appendChild(otherAnchor);
		renderPopover({ anchor, nodeTypeName: 'Gmail' });
		renderPopover({ anchor: otherAnchor, nodeTypeName: 'Slack' });

		await user.hover(anchor);
		await screen.findByText('Gmail');
		await user.hover(otherAnchor);
		await screen.findByText('Slack');
		await user.hover(anchor);

		expect(await screen.findByText('Gmail')).toBeInTheDocument();
		expect(screen.queryByText('Slack')).not.toBeInTheDocument();

		otherAnchor.remove();
	});

	it('hides the card while its row has no box', async () => {
		renderPopover({ anchor, active: true });

		const card = (await screen.findByTestId('node-restricted-popover')).closest<HTMLElement>(
			'[data-reka-popper-content-wrapper]',
		);
		await waitFor(() => expect(card?.style.visibility).toBe('hidden'));
	});

	it('keeps the focus where it is on a press in the card', async () => {
		const input = document.createElement('input');
		document.body.appendChild(input);
		renderPopover({ active: true });
		input.focus();

		await user.click(await screen.findByTestId('node-restricted-contact-admin'));

		expect(input).toHaveFocus();
		input.remove();
	});

	it('keeps every popover closed while a dialog opened from another row is open', async () => {
		const otherAnchor = document.createElement('div');
		document.body.appendChild(otherAnchor);
		renderPopover({ anchor, nodeTypeName: 'Gmail' });
		renderPopover({ anchor: otherAnchor, nodeTypeName: 'Slack' });

		await user.hover(anchor);
		await screen.findByText('Gmail');
		await user.hover(otherAnchor);
		const popover = await screen.findByText('Slack');
		await user.hover(popover);
		await user.click(screen.getByTestId('node-restricted-contact-admin'));

		expect(screen.getByTestId('contact-admin-modal')).toHaveTextContent('Slack');
		await waitFor(() =>
			expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument(),
		);

		otherAnchor.remove();
	});

	it('reopens on hover after the contact-admin dialog was opened from the popover and closed', async () => {
		const otherAnchor = document.createElement('div');
		document.body.appendChild(otherAnchor);
		renderPopover({ anchor, nodeTypeName: 'Gmail' });
		renderPopover({ anchor: otherAnchor, nodeTypeName: 'Slack' });

		await user.hover(anchor);
		await user.hover(await screen.findByTestId('node-restricted-popover'));
		await user.unhover(anchor);
		await user.click(screen.getByTestId('node-restricted-contact-admin'));
		await user.click(screen.getByTestId('contact-admin-close'));
		await waitFor(() =>
			expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument(),
		);

		await user.hover(otherAnchor);
		expect(await screen.findByText('Slack')).toBeInTheDocument();

		await user.hover(anchor);
		expect(await screen.findByText('Gmail')).toBeInTheDocument();
		expect(screen.queryByText('Slack')).not.toBeInTheDocument();

		otherAnchor.remove();
	});

	it('keeps the card of an active row closed after its dialog closes, until a new hover', async () => {
		renderPopover({ anchor, active: true });
		await screen.findByTestId('node-restricted-popover');

		await user.click(screen.getByTestId('node-restricted-contact-admin'));
		await user.click(screen.getByTestId('contact-admin-close'));
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument();

		await user.hover(anchor);
		expect(await screen.findByTestId('node-restricted-popover')).toBeInTheDocument();
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

		await user.click(await screen.findByTestId('node-restricted-contact-admin'));

		await waitFor(() =>
			expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument(),
		);
		expect(screen.getByTestId('contact-admin-modal')).toBeInTheDocument();
	});

	it('opens the contact-admin dialog for this node type', async () => {
		renderPopover({ active: true });
		expect(screen.queryByTestId('contact-admin-modal')).not.toBeInTheDocument();

		await user.click(await screen.findByTestId('node-restricted-contact-admin'));

		expect(screen.getByTestId('contact-admin-modal')).toHaveTextContent('Gmail');
	});

	it('keeps the dialog open after the pointer leaves the row and the popover', async () => {
		renderPopover({ anchor });

		await user.hover(anchor);
		const popover = await screen.findByTestId('node-restricted-popover');
		await user.click(screen.getByTestId('node-restricted-contact-admin'));
		await user.unhover(popover);
		await user.unhover(anchor);
		await waitFor(() =>
			expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument(),
		);

		expect(screen.getByTestId('contact-admin-modal')).toHaveTextContent('Gmail');
	});

	it('uses the credential type copy', async () => {
		renderPopover({ active: true, kind: 'credential', restriction: undefined });

		expect(await screen.findByText('This credential type is restricted')).toBeInTheDocument();
		expect(
			screen.getByText(
				"An administrator blocked this credential type. Workflows can't use credentials of this type until an instance administrator grants access.",
			),
		).toBeInTheDocument();
	});

	it('names the lock after the restricted kind', () => {
		renderPopover({ kind: 'credential' });
		expect(
			screen.getByRole('img', { name: 'This credential type is restricted' }),
		).toBeInTheDocument();
	});

	it('names the lock after a node by default', () => {
		renderPopover({});
		expect(screen.getByRole('img', { name: 'This node is restricted' })).toBeInTheDocument();
	});

	it('hands the contact-admin request and its audience to a listening parent instead of opening its own dialog', async () => {
		mockPolicyProject({ type: 'team' });
		const onContactAdmin = vi.fn();
		renderComponent({
			props: { active: true, restriction: { scope: 'project' } },
			attrs: { onContactAdmin },
		});

		await user.click(await screen.findByTestId('node-restricted-contact-admin'));

		expect(onContactAdmin).toHaveBeenCalledExactlyOnceWith('project');
		expect(screen.queryByTestId('contact-admin-modal')).not.toBeInTheDocument();
		// The parent's dialog opens at once, so the card must not stay on top of it.
		await waitFor(() =>
			expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument(),
		);
	});

	describe('keyboard', () => {
		const lock = () => screen.getByRole('img', { name: 'This node is restricted' });
		const contactButton = () => screen.getByTestId('node-restricted-contact-admin');

		it('moves the focus from the lock to the contact button on Enter and on Space', async () => {
			renderPopover({ active: true });
			await screen.findByTestId('node-restricted-popover');

			lock().focus();
			await user.keyboard('{Enter}');
			await waitFor(() => expect(contactButton()).toHaveFocus());

			lock().focus();
			await user.keyboard(' ');
			await waitFor(() => expect(contactButton()).toHaveFocus());
		});

		it('returns to the lock on Shift+Tab in the card', async () => {
			renderPopover({ active: true });
			await screen.findByTestId('node-restricted-popover');
			contactButton().focus();

			await user.keyboard('{Shift>}{Tab}{/Shift}');

			expect(lock()).toHaveFocus();
			expect(screen.getByTestId('node-restricted-popover')).toBeInTheDocument();
		});

		it('closes the card on Escape and keeps it closed until the row is no longer active', async () => {
			const { rerender } = renderPopover({ active: true });
			await screen.findByTestId('node-restricted-popover');
			lock().focus();

			await user.keyboard('{Escape}');
			await waitFor(() =>
				expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument(),
			);

			await rerender({ active: false });
			await rerender({ active: true });
			expect(await screen.findByTestId('node-restricted-popover')).toBeInTheDocument();
		});

		it('opens a dismissed card again on a new hover or a press while the lock keeps the focus', async () => {
			// A field lock sits inside its anchor, so its focus alone keeps the card wanted.
			renderComponent({ props: { anchor }, container: anchor });
			const popover = () => screen.queryByTestId('node-restricted-popover');
			await user.hover(anchor);
			await screen.findByTestId('node-restricted-popover');
			lock().focus();

			await user.keyboard('{Escape}');
			await waitFor(() => expect(popover()).not.toBeInTheDocument());
			await user.unhover(anchor);
			await user.hover(anchor);
			expect(await screen.findByTestId('node-restricted-popover')).toBeInTheDocument();
			expect(lock()).toHaveFocus();

			await user.keyboard('{Escape}');
			await waitFor(() => expect(popover()).not.toBeInTheDocument());
			await user.pointer({ keys: '[MouseLeft]', target: lock() });
			expect(await screen.findByTestId('node-restricted-popover')).toBeInTheDocument();
		});

		it('closes the card on Escape in the card and returns the focus to the lock', async () => {
			renderPopover({ active: true });
			await screen.findByTestId('node-restricted-popover');
			contactButton().focus();

			await user.keyboard('{Escape}');

			expect(lock()).toHaveFocus();
			await waitFor(() =>
				expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument(),
			);
		});

		it('moves the focus to the lock before a contact request from the keyboard', async () => {
			const onContactAdmin = vi.fn();
			renderComponent({ props: { active: true }, attrs: { onContactAdmin } });
			await screen.findByTestId('node-restricted-popover');
			contactButton().focus();

			await user.keyboard('{Enter}');

			expect(onContactAdmin).toHaveBeenCalledOnce();
			expect(lock()).toHaveFocus();
		});
	});

	it('keeps a pointer-down inside the popover from reaching the document', async () => {
		const onDocumentPointerDown = vi.fn();
		document.addEventListener('pointerdown', onDocumentPointerDown);
		renderPopover({ active: true });

		await user.pointer({
			keys: '[MouseLeft>]',
			target: await screen.findByTestId('node-restricted-contact-admin'),
		});

		expect(onDocumentPointerDown).not.toHaveBeenCalled();
		document.removeEventListener('pointerdown', onDocumentPointerDown);
	});

	it('sends a project restriction to the project admins', async () => {
		renderPopover({ active: true, restriction: { scope: 'project' } });
		mockPolicyProject({ type: 'team' });

		expect(
			await screen.findByText(
				'An administrator blocked this node in this project. To use it, contact a project admin for access.',
			),
		).toBeInTheDocument();
		await user.click(screen.getByTestId('node-restricted-contact-admin'));

		expect(screen.getByTestId('contact-admin-modal')).toHaveAttribute('data-audience', 'project');
	});

	it('says a project admin can allow a delegated node', async () => {
		renderPopover({ active: true, restriction: { scope: 'instance', optInAvailable: true } });
		mockPolicyProject({ type: 'team' });

		expect(
			await screen.findByText(
				'This node needs approval in each project. A project admin can allow it for this project.',
			),
		).toBeInTheDocument();
		expect(screen.getByTestId('node-restricted-contact-admin')).toHaveTextContent(
			'Contact project admin',
		);
	});
});
