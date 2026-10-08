import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { InstanceAiProvenanceListItem } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
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

const { fetchMyAutomations } = vi.hoisted(() => ({ fetchMyAutomations: vi.fn() }));

vi.mock('../../provenance/provenance.api', () => ({ fetchMyAutomations }));

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
		const { getAllByTestId, getByRole } = await renderLoaded();

		const [first, second] = getAllByTestId('assistant-automation-row');
		const openChat = within(first).getByRole('button', {
			name: 'Open the chat that built Weekly report',
		});
		expect(openChat).toBe(within(first).getByTestId('assistant-automation-open-chat'));
		expect(within(second).queryByTestId('assistant-automation-open-chat')).not.toBeInTheDocument();
		expect(getByRole('list', { name: 'Automations' })).toBeInTheDocument();
	});

	it('opens the chat that built the workflow', async () => {
		const { getByRole } = await renderLoaded();

		await userEvent.click(getByRole('button', { name: 'Open the chat that built Weekly report' }));

		await waitFor(() =>
			expect(router.currentRoute.value).toMatchObject({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId: 'thread-wf-1' },
			}),
		);
	});

	it('keeps "Open chat" in the tab order', async () => {
		const { getByRole } = await renderLoaded();

		const openChat = getByRole('button', { name: 'Open the chat that built Weekly report' });
		expect(openChat).not.toHaveAttribute('tabindex', '-1');
		openChat.focus();
		expect(openChat).toHaveFocus();
	});

	it('links "Show all" to the workflows overview', async () => {
		const { getByRole } = await renderLoaded();

		expect(getByRole('link', { name: 'Show all' })).toHaveAttribute('href', '/home/workflows');
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
