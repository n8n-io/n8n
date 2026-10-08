import { beforeEach, describe, expect, it } from 'vitest';
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
		const { getByRole } = render(chat('a', 'Weekly digest'));

		expect(getByRole('menuitem')).toHaveAttribute('aria-label', 'Weekly digest');
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
