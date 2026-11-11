import { PERSONAL_SELF_HEALING_CONFIGURATION_VIEW } from '@n8n/frontend-constants/self-healing';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent } from '@testing-library/vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import * as api from '../inbox.api';
import { useInboxStore } from '../inbox.store';
import InboxEmptyState from './InboxEmptyState.vue';

const render = createComponentRenderer(InboxEmptyState);

vi.mock('../inbox.api');

const emptyPage = {
	data: [],
	nextCursor: null,
	hasMore: false,
	partial: false,
	failedSources: [],
	disabledSources: [],
};

async function renderEmptyState(
	availableTypes: Array<'workflow_review' | 'self_healing_result'>,
	tab: 'open' | 'closed' = 'open',
) {
	useSettingsStore().settings.inbox = { enabled: true, availableTypes, failedTypes: [] };
	const store = useInboxStore();
	store.reset();
	store.activeTab = tab;
	await store.refreshListAndSummary();
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', component: { render: () => null } },
			{
				path: '/projects/:projectId/self-healing/:configurationId',
				name: PERSONAL_SELF_HEALING_CONFIGURATION_VIEW,
				component: { render: () => null },
			},
		],
	});
	await router.push('/');
	return { router, ...render({ global: { plugins: [router] } }) };
}

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(api.fetchInbox).mockResolvedValue(emptyPage);
	vi.mocked(api.fetchInboxSummary).mockResolvedValue({
		counts: { open: 0, closed: 0 },
		partial: false,
		failedSources: [],
		disabledSources: [],
	});
	vi.mocked(api.fetchSelfHealingStatus).mockResolvedValue({
		isReviewer: false,
		setupProjectId: 'personal',
	});
});

it.each([
	['open', 'No open reviews', 'Reviews you authored or participate in appear here.'],
	['closed', 'No closed reviews', 'Reviews that were approved or discarded appear here.'],
] as const)('shows review copy on the %s tab with workflow reviews', async (tab, title, body) => {
	const { getByTestId } = await renderEmptyState(['workflow_review'], tab);

	expect(getByTestId('inbox-empty')).toHaveTextContent(title);
	expect(getByTestId('inbox-empty')).toHaveTextContent(body);
});

it('opens a new personal configuration from the setup prompt', async () => {
	const { getByRole, getByTestId, router } = await renderEmptyState(['self_healing_result']);

	expect(getByTestId('inbox-empty')).toHaveTextContent('Get fixes for failed workflows');
	await fireEvent.click(getByRole('button', { name: 'Set up self-healing' }));

	await vi.waitFor(() =>
		expect(router.currentRoute.value.fullPath).toBe('/projects/personal/self-healing/new'),
	);
});

it.each([
	[
		'open',
		'No open reviews',
		"When a workflow fails, the Assistant's suggested fix appears here for you to review.",
	],
	['closed', 'No closed reviews', 'Reviews that were approved or discarded appear here.'],
] as const)('shows self-healing copy on the %s tab once it is set up', async (tab, title, body) => {
	vi.mocked(api.fetchSelfHealingStatus).mockResolvedValue({
		isReviewer: true,
		setupProjectId: 'personal',
	});
	const { getByTestId, queryByRole } = await renderEmptyState(['self_healing_result'], tab);

	expect(getByTestId('inbox-empty')).toHaveTextContent(title);
	expect(getByTestId('inbox-empty')).toHaveTextContent(body);
	expect(queryByRole('button')).not.toBeInTheDocument();
});
