import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { InstanceAiProvenanceListItem, PushMessage } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger, mockedStore } from '@/__tests__/utils';
import { INSTANCE_AI_THREAD_VIEW } from '../../constants';
import { resetExperienceModeState } from '../../experience/useExperienceMode';
import { useInstanceAiStore } from '../../instanceAi.store';
import AssistantAutomationsSection from '../AssistantAutomationsSection.vue';
import {
	chat,
	configureInstanceAi,
	createTestRouter,
	stubLocalStorage,
	T0,
	T1,
} from './navigationFixtures';

const { fetchMyAutomations, pushHandlers, pushStore } = vi.hoisted(() => {
	const handlers = new Set<(event: PushMessage) => void>();
	return {
		fetchMyAutomations: vi.fn(),
		pushHandlers: handlers,
		pushStore: {
			pushConnect: vi.fn(),
			pushDisconnect: vi.fn(),
			addEventListener: vi.fn((handler: (event: PushMessage) => void) => {
				handlers.add(handler);
				return () => handlers.delete(handler);
			}),
		},
	};
});

vi.mock('../../provenance/provenance.api', () => ({ fetchMyAutomations }));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => pushStore,
}));

function emit(event: PushMessage) {
	for (const handler of [...pushHandlers]) handler(event);
}

const COLLAPSED_KEY = 'n8n:sidebar:instance-ai-automations-collapsed';

const storage = new Map<string, string>();
const renderComponent = createComponentRenderer(AssistantAutomationsSection);

let router: Router;
let instanceAiStore: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

function automation(
	workflowId: string,
	name: string,
	overrides: Partial<InstanceAiProvenanceListItem> = {},
): InstanceAiProvenanceListItem {
	return {
		workflowId,
		name,
		active: false,
		threadId: `thread-${workflowId}`,
		createdAt: T0,
		canOpenThread: false,
		...overrides,
	};
}

const twoAutomations = [
	automation('wf-1', 'Weekly report', { active: true, canOpenThread: true }),
	automation('wf-2', 'CRM sync'),
];

/** Automations `Workflow <from>` to `Workflow <to>`, each with a chat the user can open. */
function numberedAutomations(from: number, to: number) {
	return Array.from({ length: to - from + 1 }, (_, index) => {
		const number = from + index;
		return automation(`wf-${number}`, `Workflow ${number}`, { canOpenThread: true });
	});
}

/** Loads the list again, as when the user comes back to the tab, and waits for the new list. */
async function reload(items: InstanceAiProvenanceListItem[]) {
	const calls = fetchMyAutomations.mock.calls.length;
	fetchMyAutomations.mockResolvedValue(items);
	document.dispatchEvent(new Event('visibilitychange'));
	await vi.waitFor(() => expect(fetchMyAutomations).toHaveBeenCalledTimes(calls + 1));
	await new Promise(setImmediate);
	await nextTick();
}

function render(props: { collapsed?: boolean } = {}) {
	return renderComponent({
		props: { collapsed: false, ...props },
		global: { plugins: [router], stubs: { RouterLink: false } },
	});
}

async function renderLoaded(items: InstanceAiProvenanceListItem[] = twoAutomations) {
	fetchMyAutomations.mockResolvedValue(items);
	const result = render();
	await waitFor(() => expect(result.getByTestId('assistant-automations')).toBeInTheDocument());
	return result;
}

describe('AssistantAutomationsSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pushHandlers.clear();
		storage.clear();
		stubLocalStorage(storage);
		createTestingPinia();
		resetExperienceModeState();
		instanceAiStore = mockedStore(useInstanceAiStore);
		instanceAiStore.threads = [];
		router = createTestRouter();
		configureInstanceAi({ experienceModes: true });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('lists the automations with their names, links and On or Off status', async () => {
		const { getByRole, getAllByTestId } = await renderLoaded();

		const list = getByRole('list', { name: 'Automations' });
		const rows = within(list).getAllByRole('listitem');
		expect(rows).toEqual(getAllByTestId('assistant-automation-row'));
		expect(within(list).getByRole('menuitem', { name: 'Weekly report, On' })).toHaveAttribute(
			'href',
			'/workflow/wf-1',
		);
		expect(within(list).getByRole('menuitem', { name: 'CRM sync, Off' })).toHaveAttribute(
			'href',
			'/workflow/wf-2',
		);
		expect(getAllByTestId('assistant-automation-status').map((s) => s.textContent?.trim())).toEqual(
			['On', 'Off'],
		);
		expect(fetchMyAutomations).toHaveBeenCalledWith(expect.anything(), 5);
	});

	it('gives each row a unique id', async () => {
		const { getAllByRole } = await renderLoaded();

		const ids = getAllByRole('menuitem').map((item) => item.id);
		expect(new Set(ids).size).toBe(2);
	});

	it('offers "Open chat" only for a chat the user can open', async () => {
		const { getAllByTestId } = await renderLoaded();

		const [first, second] = getAllByTestId('assistant-automation-row');
		const openChat = within(first).getByRole('button', {
			name: 'Open chat for Weekly report',
		});
		expect(openChat).toBe(within(first).getByTestId('assistant-automation-open-chat'));
		expect(within(second).queryByTestId('assistant-automation-open-chat')).not.toBeInTheDocument();
	});

	it('opens the chat that built the workflow', async () => {
		const { getByRole } = await renderLoaded();

		await userEvent.click(getByRole('button', { name: 'Open chat for Weekly report' }));

		await waitFor(() =>
			expect(router.currentRoute.value).toMatchObject({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId: 'thread-wf-1' },
			}),
		);
	});

	it('keeps "Open chat" in the tab order', async () => {
		const { getByRole } = await renderLoaded();

		const openChat = getByRole('button', { name: 'Open chat for Weekly report' });
		expect(openChat).not.toHaveAttribute('tabindex', '-1');
		openChat.focus();
		expect(openChat).toHaveFocus();
	});

	it('shows "Open chat" as the tooltip, and starts the button name with it', async () => {
		const { getByTestId } = await renderLoaded();

		const openChat = getByTestId('assistant-automation-open-chat');
		expect(openChat).toHaveAccessibleName('Open chat for Weekly report');
		await hoverTooltipTrigger(openChat);

		await waitFor(() => expect(getTooltip()).toHaveTextContent('Open chat'));
	});

	it('opens the workflow when the user clicks its status', async () => {
		const { getAllByTestId } = await renderLoaded();

		await userEvent.click(getAllByTestId('assistant-automation-status')[1]);

		await waitFor(() => expect(router.currentRoute.value.path).toBe('/workflow/wf-2'));
	});

	it('keeps the status link out of the tab order and away from screen readers', async () => {
		const { getAllByTestId, getAllByRole } = await renderLoaded();

		const statusLink = getAllByTestId('assistant-automation-status')[0].closest('a');
		expect(statusLink).toHaveAttribute('href', '/workflow/wf-1');
		expect(statusLink).toHaveAttribute('tabindex', '-1');
		expect(statusLink).toHaveAttribute('aria-hidden', 'true');
		expect(getAllByRole('link').map((link) => link.textContent?.trim())).toEqual(['Show all']);
	});

	it('links "Show all" to the workflows overview, and says where it goes', async () => {
		const { getByRole } = await renderLoaded();

		const showAll = getByRole('link', { name: 'Show all workflows' });
		expect(showAll).toHaveAttribute('href', '/home/workflows');
		expect(showAll).toHaveTextContent('Show all');
		expect(showAll).toHaveAccessibleDescription('Automations');
	});

	it('gives the section a heading', async () => {
		const { getByRole } = await renderLoaded();

		const heading = getByRole('heading', { level: 2, name: 'Automations' });
		expect(within(heading).getByRole('button', { name: 'Automations' })).toBeInTheDocument();
	});

	it('says that nothing runs automatically yet when the Assistant built nothing', async () => {
		const { getByTestId, queryByRole } = await renderLoaded([]);

		expect(getByTestId('assistant-automations-empty')).toHaveTextContent(
			'Nothing runs automatically yet.',
		);
		expect(queryByRole('list')).not.toBeInTheDocument();
	});

	it('collapses the list, and remembers it', async () => {
		const { getByRole, queryByRole } = await renderLoaded();

		await userEvent.click(getByRole('button', { name: 'Automations' }));

		expect(getByRole('button', { name: 'Automations' })).toHaveAttribute('aria-expanded', 'false');
		expect(queryByRole('list')).not.toBeInTheDocument();
		await waitFor(() => expect(storage.get(COLLAPSED_KEY)).toBe('true'));
	});

	it('starts collapsed when the user collapsed it before', async () => {
		storage.set(COLLAPSED_KEY, 'true');

		const { getByRole, queryByTestId } = await renderLoaded();

		expect(getByRole('button', { name: 'Automations' })).toHaveAttribute('aria-expanded', 'false');
		expect(queryByTestId('assistant-automation-row')).not.toBeInTheDocument();
	});

	it('shows nothing until the first list arrives', async () => {
		const pending = createDeferredPromise<InstanceAiProvenanceListItem[]>();
		fetchMyAutomations.mockReturnValue(pending.promise);

		const { queryByTestId, findByTestId } = render();
		expect(queryByTestId('assistant-automations')).not.toBeInTheDocument();

		pending.resolve(twoAutomations);
		expect(await findByTestId('assistant-automations')).toBeInTheDocument();
	});

	it('shows nothing and no error when the first load fails', async () => {
		fetchMyAutomations.mockRejectedValue(new Error('offline'));

		const { queryByTestId, queryByRole } = render();
		await vi.waitFor(() => expect(fetchMyAutomations).toHaveBeenCalled());
		await nextTick();

		expect(queryByTestId('assistant-automations')).not.toBeInTheDocument();
		expect(queryByRole('alert')).not.toBeInTheDocument();
	});

	it('refreshes the list when a chat ends a turn, and keeps the last list if that fails', async () => {
		instanceAiStore.threads = [chat('a', 'Build report', { state: 'working', lastActivityAt: T0 })];
		const { getAllByTestId, getByRole } = await renderLoaded([twoAutomations[1]]);
		expect(getAllByTestId('assistant-automation-row')).toHaveLength(1);

		fetchMyAutomations.mockResolvedValueOnce(twoAutomations);
		instanceAiStore.threads = [chat('a', 'Build report', { state: 'idle', lastActivityAt: T1 })];

		await waitFor(() => expect(getAllByTestId('assistant-automation-row')).toHaveLength(2));
		expect(getByRole('menuitem', { name: 'Weekly report, On' })).toBeInTheDocument();

		fetchMyAutomations.mockRejectedValueOnce(new Error('offline'));
		instanceAiStore.threads = [
			chat('a', 'Build report', { state: 'idle', lastActivityAt: '2026-03-01T12:00:00.000Z' }),
		];
		await vi.waitFor(() => expect(fetchMyAutomations).toHaveBeenCalledTimes(3));

		expect(getAllByTestId('assistant-automation-row')).toHaveLength(2);
	});

	it('loads the list again when the tab becomes visible', async () => {
		const { getAllByTestId } = await renderLoaded([twoAutomations[1]]);
		fetchMyAutomations.mockResolvedValue(twoAutomations);

		document.dispatchEvent(new Event('visibilitychange'));

		await waitFor(() => expect(getAllByTestId('assistant-automation-row')).toHaveLength(2));
		expect(fetchMyAutomations).toHaveBeenCalledTimes(2);
	});

	it('shows the list when the tab becomes visible after a failed first load', async () => {
		fetchMyAutomations.mockRejectedValueOnce(new Error('offline'));
		const { queryByTestId, findByTestId } = render();
		await vi.waitFor(() => expect(fetchMyAutomations).toHaveBeenCalledTimes(1));
		expect(queryByTestId('assistant-automations')).not.toBeInTheDocument();
		fetchMyAutomations.mockResolvedValue(twoAutomations);

		document.dispatchEvent(new Event('visibilitychange'));

		expect(await findByTestId('assistant-automations')).toBeInTheDocument();
	});

	describe('keyboard focus when the list changes', () => {
		it('moves the focus to the row that takes the place of the focused row', async () => {
			const { getByRole } = await renderLoaded(numberedAutomations(1, 5));
			getByRole('button', { name: 'Open chat for Workflow 5' }).focus();

			// A new automation takes the top place, so the fifth one leaves the list.
			await reload([automation('wf-6', 'Workflow 6'), ...numberedAutomations(1, 4)]);

			expect(getByRole('menuitem', { name: 'Workflow 6, Off' })).toBeInTheDocument();
			expect(getByRole('menuitem', { name: 'Workflow 4, Off' })).toHaveFocus();
		});

		it('moves the focus to the next row when a row in the middle goes away', async () => {
			const { getByRole } = await renderLoaded(numberedAutomations(1, 3));
			getByRole('menuitem', { name: 'Workflow 2, Off' }).focus();

			await reload([...numberedAutomations(1, 1), ...numberedAutomations(3, 3)]);

			expect(getByRole('menuitem', { name: 'Workflow 3, Off' })).toHaveFocus();
		});

		it('moves the focus to the row link when the "Open chat" button of the row goes away', async () => {
			const { getByRole, queryByRole } = await renderLoaded(numberedAutomations(1, 2));
			getByRole('button', { name: 'Open chat for Workflow 2' }).focus();

			await reload([...numberedAutomations(1, 1), automation('wf-2', 'Workflow 2')]);

			expect(queryByRole('button', { name: 'Open chat for Workflow 2' })).not.toBeInTheDocument();
			expect(getByRole('menuitem', { name: 'Workflow 2, Off' })).toHaveFocus();
		});

		it('moves the focus to the section toggle when no automation is left', async () => {
			const { getByRole, getByTestId } = await renderLoaded(numberedAutomations(1, 1));
			getByRole('menuitem', { name: 'Workflow 1, Off' }).focus();

			await reload([]);

			expect(getByTestId('assistant-automations-empty')).toBeInTheDocument();
			expect(getByRole('button', { name: 'Automations' })).toHaveFocus();
		});

		it('leaves the focus on a row that moves down the list', async () => {
			const { getByRole } = await renderLoaded(numberedAutomations(1, 5));
			const row = getByRole('menuitem', { name: 'Workflow 1, Off' });
			row.focus();

			await reload([automation('wf-6', 'Workflow 6'), ...numberedAutomations(1, 4)]);

			expect(getByRole('menuitem', { name: 'Workflow 1, Off' })).toBe(row);
			expect(row).toHaveFocus();
		});

		it('does not take the focus from an element outside the list', async () => {
			const outside = document.createElement('button');
			document.body.appendChild(outside);
			await renderLoaded(numberedAutomations(1, 5));
			outside.focus();

			await reload([automation('wf-6', 'Workflow 6'), ...numberedAutomations(1, 4)]);

			expect(outside).toHaveFocus();
			outside.remove();
		});
	});

	it('updates the status one second after a listed workflow is turned off elsewhere', async () => {
		const { getByRole } = await renderLoaded();
		vi.useFakeTimers();
		fetchMyAutomations.mockResolvedValue([
			automation('wf-1', 'Weekly report', { active: false, canOpenThread: true }),
			twoAutomations[1],
		]);

		emit({ type: 'workflowDeactivated', data: { workflowId: 'wf-1' } });
		await vi.advanceTimersByTimeAsync(999);
		expect(fetchMyAutomations).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		vi.useRealTimers();

		await waitFor(() =>
			expect(getByRole('menuitem', { name: 'Weekly report, Off' })).toBeInTheDocument(),
		);
		expect(fetchMyAutomations).toHaveBeenCalledTimes(2);
	});

	it('ignores changes to workflows that are not in the list', async () => {
		await renderLoaded();
		vi.useFakeTimers();

		emit({ type: 'workflowActivated', data: { workflowId: 'wf-9', activeVersionId: 'v1' } });
		await vi.advanceTimersByTimeAsync(5000);

		expect(fetchMyAutomations).toHaveBeenCalledTimes(1);
	});

	it('asks the server only once the sidebar opens', async () => {
		fetchMyAutomations.mockResolvedValue(twoAutomations);
		const { queryByTestId, findByTestId, rerender } = render({ collapsed: true });
		await new Promise(setImmediate);
		document.dispatchEvent(new Event('visibilitychange'));
		await new Promise(setImmediate);
		expect(fetchMyAutomations).not.toHaveBeenCalled();
		expect(pushStore.addEventListener).not.toHaveBeenCalled();
		expect(queryByTestId('assistant-automations')).not.toBeInTheDocument();

		await rerender({ collapsed: false });

		expect(await findByTestId('assistant-automations')).toBeInTheDocument();
		expect(fetchMyAutomations).toHaveBeenCalledTimes(1);
	});

	it.each([
		['experience modes are off', { experienceModes: false }, false],
		['Instance AI is not available', { experienceModes: true, available: false }, false],
		['the sidebar is collapsed', { experienceModes: true }, true],
	])('renders nothing when %s', async (_, config, collapsed) => {
		configureInstanceAi(config);
		fetchMyAutomations.mockResolvedValue(twoAutomations);

		const { queryByTestId } = render({ collapsed });
		await nextTick();
		await new Promise(setImmediate);

		expect(queryByTestId('assistant-automations')).not.toBeInTheDocument();
	});

	it('does not ask the server while experience modes are off or the Assistant is not available', async () => {
		configureInstanceAi({ experienceModes: false });
		render();
		configureInstanceAi({ experienceModes: true, available: false });
		render();
		await new Promise(setImmediate);

		expect(fetchMyAutomations).not.toHaveBeenCalled();
	});
});
