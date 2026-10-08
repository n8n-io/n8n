import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { useUsersStore } from '@n8n/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import AssistantChatRow from '../AssistantChatRow.vue';
import type { ThreadDisplayState } from '../threadDisplayState';
import { chat, createTestRouter } from './navigationFixtures';

const OWNER = { id: 'owner-1', name: 'Alice Owner' };
const sharedWith = { projectId: 'project-1', projectName: 'Marketing' };

const renderRow = createComponentRenderer(AssistantChatRow);

// Reka UI opens a tooltip on a mouse pointermove, after the show delay. The content is
// teleported, so it is read from the body.
async function hoverTooltip(element: Element) {
	element.dispatchEvent(
		new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerType: 'mouse' }),
	);
	return await waitFor(() => screen.getByTestId('tooltip-content'), { timeout: 2000 });
}

const rowIcon = (row: HTMLElement) => row.querySelector('[data-icon]')?.getAttribute('data-icon');

function render(thread: InstanceAiThreadSummary, state?: ThreadDisplayState) {
	return renderRow({
		props: { thread, state },
		global: { plugins: [createTestRouter()], stubs: { RouterLink: false } },
	});
}

describe('AssistantChatRow', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		useUsersStore().currentUserId = 'teammate-1';
	});

	it('labels a private chat with its title only', () => {
		const { getByRole, queryByTestId } = render(chat('a', 'Weekly digest'));

		expect(getByRole('menuitem')).toHaveAttribute('aria-label', 'Weekly digest');
		expect(rowIcon(getByRole('menuitem'))).toBe('message-circle');
		expect(queryByTestId('instance-ai-thread-shared-a')).not.toBeInTheDocument();
	});

	it('marks a shared chat with the shared icon', () => {
		const { getByRole } = render(chat('a', 'Weekly digest', { sharedWith, owner: OWNER }));

		expect(rowIcon(getByRole('menuitem'))).toBe('users');
	});

	it('shows a teammate who shared the chat when the pointer is on the icon', async () => {
		const { getByTestId } = render(chat('a', 'Weekly digest', { sharedWith, owner: OWNER }));

		const target = getByTestId('instance-ai-thread-shared-a');
		// Screen readers get the label from the row, and the row link stays the one tab stop.
		expect(target).toHaveAttribute('aria-hidden', 'true');
		expect(target).toHaveAttribute('tabindex', '-1');
		expect(target).toHaveAttribute('href', '/assistant/a');

		expect(await hoverTooltip(target)).toHaveTextContent('Shared by Alice Owner');
	});

	it('shows the owner where the chat is shared when the pointer is on the icon', async () => {
		useUsersStore().currentUserId = OWNER.id;
		const { getByTestId } = render(chat('a', 'Weekly digest', { sharedWith, owner: OWNER }));

		expect(await hoverTooltip(getByTestId('instance-ai-thread-shared-a'))).toHaveTextContent(
			'Shared with Marketing',
		);
	});

	it('shows a name with markup as text in the tooltip', async () => {
		const { getByTestId } = render(
			chat('a', 'Digest', { sharedWith, owner: { id: OWNER.id, name: '<b>Eve</b>' } }),
		);

		const tooltip = await hoverTooltip(getByTestId('instance-ai-thread-shared-a'));
		expect(tooltip).toHaveTextContent('Shared by <b>Eve</b>');
		expect(tooltip.querySelector('b')).toBeNull();
	});

	it('tells a teammate who shared the chat', () => {
		const { getByRole } = render(chat('a', 'Weekly digest', { sharedWith, owner: OWNER }));

		expect(getByRole('menuitem')).toHaveAttribute(
			'aria-label',
			'Weekly digest, Shared by Alice Owner',
		);
		expect(getByRole('menuitem')).toHaveAttribute('href', '/assistant/a');
	});

	it('tells the owner where the chat is shared', () => {
		useUsersStore().currentUserId = OWNER.id;
		const { getByRole } = render(chat('a', 'Weekly digest', { sharedWith, owner: OWNER }));

		expect(getByRole('menuitem')).toHaveAttribute(
			'aria-label',
			'Weekly digest, Shared with Marketing',
		);
	});

	it('names the shared label before the state', () => {
		const { getByRole } = render(
			chat('a', 'Weekly digest', { sharedWith, owner: OWNER }),
			'needs-you',
		);

		expect(getByRole('menuitem')).toHaveAttribute(
			'aria-label',
			'Weekly digest, Shared by Alice Owner, Waiting for you',
		);
	});

	it('falls back to "the owner" and "this project" without names', () => {
		const teammateView = render(
			chat('a', 'Digest', { sharedWith, owner: { id: OWNER.id, name: '' } }),
		);
		expect(teammateView.getByRole('menuitem')).toHaveAttribute(
			'aria-label',
			'Digest, Shared by the owner',
		);
		teammateView.unmount();

		useUsersStore().currentUserId = OWNER.id;
		const ownerView = render(
			chat('b', 'Digest', { sharedWith: { ...sharedWith, projectName: '' }, owner: OWNER }),
		);
		expect(ownerView.getByRole('menuitem')).toHaveAttribute(
			'aria-label',
			'Digest, Shared with this project',
		);
	});
});
