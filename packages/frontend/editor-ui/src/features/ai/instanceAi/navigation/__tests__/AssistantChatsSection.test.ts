import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger, mockedStore } from '@/__tests__/utils';
import { useInstanceAiStore } from '../../instanceAi.store';
import {
	INSTANCE_AI_THREADS_VIEW,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_VIEW,
} from '../../constants';
import { resetThreadLastViewedState, useThreadLastViewed } from '../useThreadLastViewed';
import AssistantChatsSection from '../AssistantChatsSection.vue';

const LAST_VIEWED_KEY = 'n8n:instance-ai:last-viewed:user-1';
const COLLAPSED_KEY = 'n8n:sidebar:instance-ai-chats-collapsed';
const T0 = '2026-03-01T10:00:00.000Z';
const T1 = '2026-03-01T11:00:00.000Z';

const storage = new Map<string, string>();
const renderComponent = createComponentRenderer(AssistantChatsSection);

let router: Router;
let instanceAiStore: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

function createTestRouter() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', name: 'home', component: { template: '<div />' } },
			{ path: '/assistant', name: INSTANCE_AI_VIEW, component: { template: '<div />' } },
			{
				path: '/assistant/history',
				name: INSTANCE_AI_THREADS_VIEW,
				component: { template: '<div />' },
			},
			{
				path: '/assistant/:threadId',
				name: INSTANCE_AI_THREAD_VIEW,
				component: { template: '<div />' },
			},
		],
	});
}

function configureInstanceAi({
	available = true,
	experienceModes = false,
}: { available?: boolean; experienceModes?: boolean } = {}) {
	const settingsStore = mockedStore(useSettingsStore);
	settingsStore.isModuleActive = vi.fn().mockReturnValue(available);
	settingsStore.moduleSettings = {
		'instance-ai': {
			enabled: true,
			mcpConnectionsAvailable: true,
			localGatewayDisabled: false,
			browserUseEnabled: true,
			proxyEnabled: false,
			cloudManaged: false,
			setupCompleted: true,
			sandboxEnabled: true,
			workflowBuilderAvailable: true,
			sandboxUnavailableReason: null,
			runDebugEnabled: false,
			experience: { enabled: experienceModes, defaultMode: 'simple' },
		},
	};
	vi.mocked(useRBACStore().hasScope).mockImplementation((scope) => scope === 'instanceAi:message');
}

function chat(id: string, title: string, overview: Partial<InstanceAiThreadSummary> = {}) {
	return { id, title, createdAt: T0, updatedAt: T0, ...overview } satisfies InstanceAiThreadSummary;
}

/** One chat for each state the sidebar can show, plus one the viewer already saw. */
function chatsInEveryState(): InstanceAiThreadSummary[] {
	return [
		chat('waiting', 'Approve invoice', {
			state: 'needs-you',
			needsInput: true,
			lastActivityAt: T1,
		}),
		chat('busy', 'Build CRM sync', { state: 'working', lastActivityAt: T1 }),
		chat('broken', 'Fix Slack alert', { state: 'failed', lastActivityAt: T1 }),
		chat('unseen', 'Weekly report', { state: 'idle', lastActivityAt: T1 }),
		chat('seen', 'Team digest', { state: 'idle', lastActivityAt: T0 }),
	];
}

function render(props: { collapsed?: boolean } = {}) {
	return renderComponent({
		props: { collapsed: false, ...props },
		global: { plugins: [router], stubs: { RouterLink: false } },
	});
}

/** Test ids of the chat rows, without the ids of their state icons. */
function rowTestIds(section: HTMLElement) {
	return within(section)
		.getAllByTestId(/^instance-ai-thread-(?!state-)/)
		.map((row) => row.getAttribute('data-test-id'));
}

function rowLabels(section: HTMLElement) {
	return within(section)
		.getAllByRole('menuitem')
		.map((item) => item.getAttribute('aria-label'));
}

describe('AssistantChatsSection', () => {
	beforeEach(() => {
		storage.clear();
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => storage.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => {
				storage.set(key, value);
			}),
		});
		createTestingPinia();
		resetThreadLastViewedState();
		useUsersStore().currentUserId = 'user-1';
		instanceAiStore = mockedStore(useInstanceAiStore);
		router = createTestRouter();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('with experience modes off', () => {
		it('lists the recent chats as before, without state icons', () => {
			configureInstanceAi();
			instanceAiStore.threads = chatsInEveryState();

			const { getByTestId, queryAllByTestId, getByRole, getAllByRole } = render();

			const section = getByTestId('instance-ai-sidebar-chats');
			expect(rowTestIds(section)).toEqual([
				'instance-ai-thread-waiting',
				'instance-ai-thread-busy',
				'instance-ai-thread-broken',
				'instance-ai-thread-unseen',
				'instance-ai-thread-seen',
			]);
			expect(rowLabels(section)).toEqual([
				'Approve invoice',
				'Build CRM sync',
				'Fix Slack alert',
				'Weekly report',
				'Team digest',
			]);
			expect(queryAllByTestId(/^instance-ai-thread-state-/)).toEqual([]);
			expect(getByRole('button', { name: 'Chats' })).toHaveAttribute('aria-expanded', 'true');
			expect(getAllByRole('link').map((link) => link.textContent?.trim())).toEqual(['View all']);
		});

		it('links each row to its chat and "View all" to the chat history', () => {
			configureInstanceAi();
			instanceAiStore.threads = [chat('a', 'First chat')];

			const { getByRole } = render();

			expect(getByRole('menuitem', { name: 'First chat' })).toHaveAttribute('href', '/assistant/a');
			expect(getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/assistant/history');
		});

		it('shows the five most recent chats and keeps the open chat listed', async () => {
			configureInstanceAi();
			instanceAiStore.threads = Array.from({ length: 7 }, (_, index) =>
				chat(`thread-${index}`, `Chat ${index}`),
			);
			await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId: 'thread-6' } });

			const { getByTestId } = render();

			expect(rowLabels(getByTestId('instance-ai-sidebar-chats'))).toEqual([
				'Chat 0',
				'Chat 1',
				'Chat 2',
				'Chat 3',
				'Chat 6',
			]);
		});

		it('collapses the list, and remembers it', async () => {
			configureInstanceAi();
			instanceAiStore.threads = [chat('a', 'First chat')];
			const { getByRole, queryByRole } = render();

			await userEvent.click(getByRole('button', { name: 'Chats' }));

			expect(getByRole('button', { name: 'Chats' })).toHaveAttribute('aria-expanded', 'false');
			expect(queryByRole('menuitem', { name: 'First chat' })).not.toBeInTheDocument();
			await waitFor(() => expect(storage.get(COLLAPSED_KEY)).toBe('true'));
		});

		it('starts collapsed when the user collapsed it before', () => {
			storage.set(COLLAPSED_KEY, 'true');
			configureInstanceAi();
			instanceAiStore.threads = [chat('a', 'First chat')];

			const { getByRole, queryByRole } = render();

			expect(getByRole('button', { name: 'Chats' })).toHaveAttribute('aria-expanded', 'false');
			expect(queryByRole('menuitem')).not.toBeInTheDocument();
		});

		it.each([
			['the sidebar is collapsed', { collapsed: true }, true, 1],
			['there is no chat', { collapsed: false }, true, 0],
			['Instance AI is not available', { collapsed: false }, false, 1],
		])('renders nothing when %s', (_, props, available, chatCount) => {
			configureInstanceAi({ available });
			instanceAiStore.threads = [chat('a', 'First chat')].slice(0, chatCount);

			const { queryByTestId } = render(props);

			expect(queryByTestId('instance-ai-sidebar-chats')).not.toBeInTheDocument();
		});

		it('loads the chats while the sidebar is collapsed, and again when the tab is visible', () => {
			configureInstanceAi();

			render({ collapsed: true });
			expect(instanceAiStore.loadThreads).toHaveBeenCalledTimes(1);

			document.dispatchEvent(new Event('visibilitychange'));
			expect(instanceAiStore.loadThreads).toHaveBeenCalledTimes(2);
		});

		it('does not load the chats when Instance AI is not available', () => {
			configureInstanceAi({ available: false });

			render();
			document.dispatchEvent(new Event('visibilitychange'));

			expect(instanceAiStore.loadThreads).not.toHaveBeenCalled();
		});
	});

	describe('with experience modes on', () => {
		beforeEach(() => {
			configureInstanceAi({ experienceModes: true });
			storage.set(LAST_VIEWED_KEY, JSON.stringify({ unseen: T0, seen: T1 }));
		});

		it('names the state of each chat in its row label', () => {
			instanceAiStore.threads = chatsInEveryState();

			const { getByTestId } = render();

			const section = getByTestId('instance-ai-sidebar-chats');
			expect(rowLabels(section)).toEqual([
				'Approve invoice, Waiting for you',
				'Build CRM sync, Working',
				'Fix Slack alert, Failed',
				'Weekly report, Ready to review',
				'Team digest',
			]);
			expect(rowTestIds(section)).toEqual([
				'instance-ai-thread-waiting',
				'instance-ai-thread-busy',
				'instance-ai-thread-broken',
				'instance-ai-thread-unseen',
				'instance-ai-thread-seen',
			]);
		});

		it('shows a state icon for each chat that needs a look, and none for a chat the user saw', () => {
			instanceAiStore.threads = chatsInEveryState();

			const { getAllByTestId } = render();

			expect(
				getAllByTestId(/^instance-ai-thread-state-/).map((icon) => icon.dataset.testId),
			).toEqual([
				'instance-ai-thread-state-waiting',
				'instance-ai-thread-state-busy',
				'instance-ai-thread-state-broken',
				'instance-ai-thread-state-unseen',
			]);
		});

		it.each([
			['waiting', 'Waiting for you'],
			['busy', 'Working'],
			['broken', 'Failed'],
			['unseen', 'Ready to review'],
		])('explains the icon of the %s chat in a tooltip', async (id, label) => {
			instanceAiStore.threads = chatsInEveryState();
			const { getByTestId } = render();

			await hoverTooltipTrigger(getByTestId(`instance-ai-thread-state-${id}`));

			await waitFor(() => expect(getTooltip()).toHaveTextContent(label));
		});

		it('keeps the state icons out of the tab order and away from screen readers', () => {
			instanceAiStore.threads = chatsInEveryState();

			const { getByTestId, getAllByRole } = render();

			const icon = getByTestId('instance-ai-thread-state-waiting');
			expect(icon).toHaveAttribute('tabindex', '-1');
			expect(icon).toHaveAttribute('aria-hidden', 'true');
			expect(getAllByRole('link').map((link) => link.textContent?.trim())).toEqual(['View all']);
		});

		it('opens the chat when the user clicks its state icon', async () => {
			instanceAiStore.threads = chatsInEveryState();
			const { getByTestId } = render();

			await userEvent.click(getByTestId('instance-ai-thread-state-unseen'));

			await waitFor(() =>
				expect(router.currentRoute.value).toMatchObject({
					name: INSTANCE_AI_THREAD_VIEW,
					params: { threadId: 'unseen' },
				}),
			);
		});

		it('removes the "Ready to review" icon once the chat view marks the chat as seen', async () => {
			instanceAiStore.threads = [
				chat('unseen', 'Weekly report', { state: 'idle', lastActivityAt: T1 }),
			];
			const { getByRole, queryByTestId } = render();
			expect(getByRole('menuitem', { name: 'Weekly report, Ready to review' })).toBeVisible();

			useThreadLastViewed().markViewed('unseen', T1);

			await waitFor(() =>
				expect(queryByTestId('instance-ai-thread-state-unseen')).not.toBeInTheDocument(),
			);
			expect(getByRole('menuitem', { name: 'Weekly report' })).toBeVisible();
		});

		it('shows "Ready to review" for an idle chat the user never opened', () => {
			storage.clear();
			instanceAiStore.threads = [
				chat('new', 'Fresh result', { state: 'idle', lastActivityAt: T0 }),
			];

			const { getByRole } = render();

			expect(getByRole('menuitem', { name: 'Fresh result, Ready to review' })).toBeVisible();
		});

		it('shows no state for a chat the server sent without one', () => {
			instanceAiStore.threads = [chat('older', 'Old chat')];

			const { getByRole, queryByTestId } = render();

			expect(getByRole('menuitem', { name: 'Old chat' })).toBeVisible();
			expect(queryByTestId('instance-ai-thread-state-older')).not.toBeInTheDocument();
		});
	});
});
