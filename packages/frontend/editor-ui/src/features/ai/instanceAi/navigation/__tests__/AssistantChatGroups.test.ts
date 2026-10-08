import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { useUsersStore } from '@n8n/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { resetThreadLastViewedState, useThreadLastViewed } from '../useThreadLastViewed';
import AssistantChatGroups from '../AssistantChatGroups.vue';
import { chat, createTestRouter, stubLocalStorage, T0, T1 } from './navigationFixtures';

const storage = new Map<string, string>();
const renderComponent = createComponentRenderer(AssistantChatGroups);

let router: Router;

function render(threads: InstanceAiThreadSummary[], openThreadId?: string) {
	return renderComponent({
		props: { threads, openThreadId },
		global: { plugins: [router], stubs: { RouterLink: false } },
	});
}

function rowLabels(list: HTMLElement) {
	return within(list)
		.getAllByRole('menuitem')
		.map((item) => item.getAttribute('aria-label'));
}

/** Chats with distinct activity times: index 0 is the newest. */
function doneChats(count: number, prefix = 'done') {
	return Array.from({ length: count }, (_, index) =>
		chat(`${prefix}-${index}`, `Done chat ${index}`, {
			updatedAt: new Date(Date.parse(T0) - index * 60_000).toISOString(),
		}),
	);
}

describe('AssistantChatGroups', () => {
	beforeEach(() => {
		storage.clear();
		stubLocalStorage(storage);
		createTestingPinia();
		resetThreadLastViewedState();
		useUsersStore().currentUserId = 'user-1';
		router = createTestRouter();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows a heading and a list for each group that has chats, in a fixed order', () => {
		const { getAllByRole, getByRole } = render([
			chat('older', 'Old chat'),
			chat('busy', 'Build CRM sync', { state: 'working', lastActivityAt: T1 }),
			chat('waiting', 'Approve invoice', { state: 'needs-you', needsInput: true }),
		]);

		const headings = getAllByRole('heading', { level: 3 });
		expect(headings.map((heading) => heading.textContent?.trim())).toEqual([
			'Needs you',
			'Working',
			'Done',
		]);
		expect(rowLabels(getByRole('list', { name: 'Needs you' }))).toEqual([
			'Approve invoice, Waiting for you',
		]);
		expect(rowLabels(getByRole('list', { name: 'Working' }))).toEqual(['Build CRM sync, Working']);
		expect(rowLabels(getByRole('list', { name: 'Done' }))).toEqual(['Old chat']);
	});

	it('hides the groups without chats', () => {
		const { queryByTestId, getByTestId } = render([
			chat('fresh', 'Fresh result', { state: 'idle', lastActivityAt: T1 }),
		]);

		expect(getByTestId('assistant-chat-group-ready')).toBeInTheDocument();
		for (const group of ['needs-you', 'working', 'done']) {
			expect(queryByTestId(`assistant-chat-group-${group}`)).not.toBeInTheDocument();
		}
	});

	it('renders nothing for no chats', () => {
		const { queryAllByRole } = render([]);

		expect(queryAllByRole('heading')).toEqual([]);
		expect(queryAllByRole('list')).toEqual([]);
	});

	it('puts a failed chat in "Needs you" with the failed icon', () => {
		const { getByTestId } = render([
			chat('broken', 'Fix Slack alert', { state: 'failed', lastActivityAt: T1 }),
		]);

		const group = getByTestId('assistant-chat-group-needs-you');
		expect(
			within(group).getByRole('menuitem', { name: 'Fix Slack alert, Failed' }),
		).toHaveAttribute('href', '/assistant/broken');
		expect(within(group).getByTestId('instance-ai-thread-state-broken')).toBeInTheDocument();
	});

	it('splits idle chats into "Ready to review" and "Done" by what the viewer saw', () => {
		storage.set('n8n:instance-ai:last-viewed:user-1', JSON.stringify({ seen: T1 }));

		const { getByRole } = render([
			chat('seen', 'Team digest', { state: 'idle', lastActivityAt: T0 }),
			chat('unseen', 'Weekly report', { state: 'idle', lastActivityAt: T1 }),
		]);

		expect(rowLabels(getByRole('list', { name: 'Ready to review' }))).toEqual([
			'Weekly report, Ready to review',
		]);
		expect(rowLabels(getByRole('list', { name: 'Done' }))).toEqual(['Team digest']);
	});

	it('moves a chat to "Done" once the chat view marks it as seen', async () => {
		const { getByRole, queryByTestId } = render([
			chat('unseen', 'Weekly report', { state: 'idle', lastActivityAt: T1 }),
		]);
		expect(getByRole('list', { name: 'Ready to review' })).toBeInTheDocument();

		useThreadLastViewed().markViewed('unseen', T1);

		await waitFor(() =>
			expect(queryByTestId('assistant-chat-group-ready')).not.toBeInTheDocument(),
		);
		expect(rowLabels(getByRole('list', { name: 'Done' }))).toEqual(['Weekly report']);
	});

	it('shows five chats, newest first, and no "Show all" for five chats or fewer', () => {
		const { getByRole, queryByTestId } = render(doneChats(5).reverse());

		expect(rowLabels(getByRole('list', { name: 'Done' }))).toEqual([
			'Done chat 0',
			'Done chat 1',
			'Done chat 2',
			'Done chat 3',
			'Done chat 4',
		]);
		expect(queryByTestId('assistant-chat-group-show-all')).not.toBeInTheDocument();
	});

	it('offers "Show all" with the number of chats in the group', () => {
		const { getByRole, getByTestId } = render(doneChats(8));

		const list = getByRole('list', { name: 'Done' });
		expect(within(list).getAllByRole('listitem')).toHaveLength(5);
		const showAll = getByRole('button', { name: 'Show all (8)' });
		expect(showAll).toBe(getByTestId('assistant-chat-group-show-all'));
		expect(showAll).toHaveAttribute('aria-expanded', 'false');
		expect(showAll).toHaveAttribute('aria-controls', list.id);
		expect(showAll).toHaveAccessibleDescription('Done');
	});

	it('shows every chat of the group on "Show all", and five again on "Show fewer"', async () => {
		const { getByRole } = render(doneChats(8));

		await userEvent.click(getByRole('button', { name: 'Show all (8)' }));

		const list = getByRole('list', { name: 'Done' });
		expect(within(list).getAllByRole('listitem')).toHaveLength(8);
		const showFewer = getByRole('button', { name: 'Show fewer' });
		expect(showFewer).toHaveAttribute('aria-expanded', 'true');

		await userEvent.click(showFewer);

		expect(within(getByRole('list', { name: 'Done' })).getAllByRole('listitem')).toHaveLength(5);
		expect(getByRole('button', { name: 'Show all (8)' })).toHaveFocus();
	});

	it('expands one group at a time', async () => {
		const working = Array.from({ length: 6 }, (_, index) =>
			chat(`w-${index}`, `Working chat ${index}`, { state: 'working' }),
		);
		const { getAllByRole, getByRole } = render([...working, ...doneChats(7)]);

		const [workingShowAll] = getAllByRole('button', { name: /^Show all/ });
		await userEvent.click(workingShowAll);

		expect(within(getByRole('list', { name: 'Working' })).getAllByRole('listitem')).toHaveLength(6);
		expect(within(getByRole('list', { name: 'Done' })).getAllByRole('listitem')).toHaveLength(5);
		expect(getByRole('button', { name: 'Show all (7)' })).toHaveAttribute('aria-expanded', 'false');
	});

	it('keeps a group expanded when the list mounts again, as after a move to another page', async () => {
		const first = render(doneChats(8));
		await userEvent.click(first.getByRole('button', { name: 'Show all (8)' }));
		first.unmount();

		const { getByRole } = render(doneChats(8));

		expect(within(getByRole('list', { name: 'Done' })).getAllByRole('listitem')).toHaveLength(8);
		expect(getByRole('button', { name: 'Show fewer' })).toHaveAttribute('aria-expanded', 'true');
	});

	it('closes a group that gets small enough, so that it does not open by itself when it grows', async () => {
		const { getByRole, queryByTestId, rerender } = render(doneChats(7));
		await userEvent.click(getByRole('button', { name: 'Show all (7)' }));

		await rerender({ threads: doneChats(5) });
		expect(queryByTestId('assistant-chat-group-show-all')).not.toBeInTheDocument();
		await rerender({ threads: doneChats(7) });

		expect(within(getByRole('list', { name: 'Done' })).getAllByRole('listitem')).toHaveLength(5);
		expect(getByRole('button', { name: 'Show all (7)' })).toHaveAttribute('aria-expanded', 'false');
	});

	it('closes a group that has no chats left', async () => {
		const working = (count: number) =>
			Array.from({ length: count }, (_, index) =>
				chat(`w-${index}`, `Working chat ${index}`, { state: 'working' }),
			);
		const { getByRole, queryByRole, rerender } = render([...working(6), ...doneChats(1)]);
		await userEvent.click(getByRole('button', { name: 'Show all (6)' }));

		await rerender({ threads: doneChats(1) });
		expect(queryByRole('list', { name: 'Working' })).not.toBeInTheDocument();
		await rerender({ threads: [...working(6), ...doneChats(1)] });

		expect(getByRole('button', { name: 'Show all (6)' })).toHaveAttribute('aria-expanded', 'false');
	});

	it('keeps the open chat in its group when it is not one of the five newest', () => {
		const chats = doneChats(7);

		const { getByRole } = render(chats, 'done-6');

		expect(rowLabels(getByRole('list', { name: 'Done' }))).toEqual([
			'Done chat 0',
			'Done chat 1',
			'Done chat 2',
			'Done chat 3',
			'Done chat 6',
		]);
		expect(getByRole('button', { name: 'Show all (7)' })).toBeInTheDocument();
	});

	describe('keyboard focus when the list changes', () => {
		const busy = (overview: Partial<InstanceAiThreadSummary> = {}) =>
			chat('busy', 'Build CRM sync', { state: 'working', lastActivityAt: T1, ...overview });

		it('keeps the focus on a chat that moves to another group', async () => {
			const { getByRole, rerender } = render([busy(), chat('older', 'Old chat')]);
			getByRole('menuitem', { name: 'Build CRM sync, Working' }).focus();

			await rerender({ threads: [busy({ state: 'idle' }), chat('older', 'Old chat')] });

			const moved = getByRole('menuitem', { name: 'Build CRM sync, Ready to review' });
			expect(within(getByRole('list', { name: 'Ready to review' })).getByRole('menuitem')).toBe(
				moved,
			);
			expect(moved).toHaveFocus();
		});

		it('moves the focus to the last row of the group when "Show fewer" goes away', async () => {
			const { getByRole, queryByTestId, rerender } = render(doneChats(6));
			await userEvent.click(getByRole('button', { name: 'Show all (6)' }));
			const showFewer = getByRole('button', { name: 'Show fewer' });
			showFewer.focus();

			await rerender({ threads: doneChats(5) });

			expect(queryByTestId('assistant-chat-group-show-all')).not.toBeInTheDocument();
			expect(getByRole('menuitem', { name: 'Done chat 4' })).toHaveFocus();
		});

		it('moves the focus to the last row of its group when the focused chat goes away', async () => {
			const { getByRole, rerender } = render(doneChats(3));
			getByRole('menuitem', { name: 'Done chat 1' }).focus();

			await rerender({ threads: doneChats(3).filter((thread) => thread.id !== 'done-1') });

			expect(getByRole('menuitem', { name: 'Done chat 2' })).toHaveFocus();
		});

		it('moves the focus to the first chat when the group of the focused chat goes away', async () => {
			const { getByRole, queryByRole, rerender } = render([busy(), chat('older', 'Old chat')]);
			getByRole('menuitem', { name: 'Build CRM sync, Working' }).focus();

			await rerender({ threads: [chat('older', 'Old chat')] });

			expect(queryByRole('list', { name: 'Working' })).not.toBeInTheDocument();
			expect(getByRole('menuitem', { name: 'Old chat' })).toHaveFocus();
		});

		it('does not take the focus from an element outside the list', async () => {
			const outside = document.createElement('button');
			document.body.appendChild(outside);
			const { rerender } = render([busy(), chat('older', 'Old chat')]);
			outside.focus();

			await rerender({ threads: [busy({ state: 'idle' }), chat('older', 'Old chat')] });

			expect(outside).toHaveFocus();
			outside.remove();
		});

		it('leaves the focus alone when the focused chat stays in its group', async () => {
			const { getByRole, rerender } = render([busy(), chat('older', 'Old chat')]);
			const row = getByRole('menuitem', { name: 'Build CRM sync, Working' });
			row.focus();

			await rerender({
				threads: [busy({ title: 'Build CRM sync v2' }), chat('older', 'Old chat')],
			});

			expect(getByRole('menuitem', { name: 'Build CRM sync v2, Working' })).toBe(row);
			expect(row).toHaveFocus();
		});
	});

	it('gives each group heading and list a unique id', () => {
		const { getAllByRole } = render([
			chat('waiting', 'Approve invoice', { needsInput: true }),
			chat('older', 'Old chat'),
		]);

		const ids = [...getAllByRole('heading'), ...getAllByRole('list')].map((element) => element.id);
		expect(new Set(ids).size).toBe(4);
		expect(ids.every((id) => id.length > 0)).toBe(true);
	});
});
