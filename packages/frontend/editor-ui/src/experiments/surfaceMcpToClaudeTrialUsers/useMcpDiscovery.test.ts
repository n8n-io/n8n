import type { McpDiscoveryState } from './mcpDiscovery.schema';
import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia';
import { effectScope, nextTick, reactive } from 'vue';

import { useMcpDiscoveryEnrollment } from './useMcpDiscovery';
import { useMcpDiscoveryStore } from './mcpDiscovery.store';

const mocks = vi.hoisted(() => ({
	request: vi.fn(),
	cloud: {
		hasCloudPlan: true,
		currentUserCloudInfo: null as { information?: Record<string, unknown> } | null,
		fetchUserCloudAccount: vi.fn(),
		getOwnerCurrentPlan: vi.fn(),
	},
	track: vi.fn(),
	ui: { sidebarMenuCollapsed: true },
	flags: { variant: undefined as string | boolean | undefined },
	users: { isInstanceOwner: true, currentUser: { id: 'member' } as { id: string } | undefined },
	settings: { isCloudDeployment: true, moduleSettings: { mcp: { mcpAccessEnabled: true } } },
}));

vi.mock('@/app/stores/ui.store', () => ({ useUIStore: () => reactive(mocks.ui) }));
vi.mock('@n8n/stores/cloudPlan.store', () => ({ useCloudPlanStore: () => reactive(mocks.cloud) }));
vi.mock('@n8n/stores/settings.store', () => ({ useSettingsStore: () => reactive(mocks.settings) }));
vi.mock('@n8n/stores/users.store', () => ({ useUsersStore: () => reactive(mocks.users) }));
vi.mock('axios', () => ({
	default: {
		request: async (options: unknown) => ({ data: { data: await mocks.request(options) } }),
	},
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track: mocks.track }) }));
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		setMcpDiscoveryEligible: vi.fn(),
		getVariant: () => reactive(mocks.flags).variant,
	}),
}));

const assigned = (hasUsedMcp = false): McpDiscoveryState => ({
	status: 'assigned',
	eligibleAt: 123,
	hasUsedMcp,
});
const waiting: McpDiscoveryState = { status: 'waiting' };

describe('MCP discovery enrollment polling', () => {
	let scope: ReturnType<typeof effectScope>;

	afterEach(() => {
		disposePinia(getActivePinia()!);
	});

	beforeEach(() => {
		vi.resetAllMocks();
		localStorage.removeItem('N8N_MCP_DISCOVERY_SIDEBAR_EXPANDED');
		mocks.ui.sidebarMenuCollapsed = true;
		mocks.users.isInstanceOwner = true;
		mocks.flags.variant = 'variant';
		mocks.cloud.hasCloudPlan = true;
		mocks.cloud.getOwnerCurrentPlan.mockResolvedValue({ metadata: { group: 'trial' } });
		mocks.cloud.currentUserCloudInfo = {
			information: {
				surveyId: 'OArzTwNz',
				'6fe33101-6331-4088-b54f-ae4afe727f96': ['Claude (incl. Claude Code)'],
			},
		};
		vi.useFakeTimers();
		setActivePinia(createPinia());
		mocks.users.currentUser = { id: 'member' };
		mocks.settings.isCloudDeployment = true;
		scope = effectScope();
	});

	afterEach(() => {
		scope.stop();
		localStorage.removeItem('N8N_MCP_DISCOVERY_SIDEBAR_EXPANDED');
		vi.useRealTimers();
	});

	async function start() {
		scope.run(useMcpDiscoveryEnrollment);
		await vi.advanceTimersByTimeAsync(0);
	}

	it.each(['control', 'variant'])(
		'expands the sidebar once for eligible %s users',
		async (variant) => {
			mocks.flags.variant = variant;
			mocks.request.mockResolvedValueOnce(waiting).mockResolvedValue(assigned());
			await start();
			expect(mocks.ui.sidebarMenuCollapsed).toBe(true);
			await vi.advanceTimersByTimeAsync(60_000);
			expect(mocks.ui.sidebarMenuCollapsed).toBe(false);

			reactive(mocks.ui).sidebarMenuCollapsed = true;
			reactive(mocks.flags).variant = false;
			await nextTick();
			reactive(mocks.flags).variant = variant;
			await nextTick();
			expect(mocks.ui.sidebarMenuCollapsed).toBe(true);
		},
	);

	it('waits for a live variant before expanding the sidebar', async () => {
		mocks.flags.variant = undefined;
		mocks.request.mockResolvedValue(assigned());
		await start();
		expect(mocks.ui.sidebarMenuCollapsed).toBe(true);
		reactive(mocks.flags).variant = 'control';
		await nextTick();
		expect(mocks.ui.sidebarMenuCollapsed).toBe(false);
	});

	it('keeps a manual collapse when the editor starts again', async () => {
		mocks.request.mockResolvedValue(assigned());
		await start();
		expect(mocks.ui.sidebarMenuCollapsed).toBe(false);
		expect(localStorage.getItem('N8N_MCP_DISCOVERY_SIDEBAR_EXPANDED')).toBe('true');
		reactive(mocks.ui).sidebarMenuCollapsed = true;
		scope.stop();
		disposePinia(getActivePinia()!);
		setActivePinia(createPinia());
		scope = effectScope();
		await start();
		expect(mocks.ui.sidebarMenuCollapsed).toBe(true);
	});

	it('does not expand the sidebar for an excluded user', async () => {
		mocks.request.mockResolvedValue({ status: 'excluded' });
		await start();
		expect(mocks.ui.sidebarMenuCollapsed).toBe(true);
		expect(localStorage.getItem('N8N_MCP_DISCOVERY_SIDEBAR_EXPANDED')).toBeNull();
	});

	it('does not start requests or polling for a non-owner', async () => {
		mocks.users.isInstanceOwner = false;
		await start();
		await vi.advanceTimersByTimeAsync(180_000);
		expect(mocks.request).not.toHaveBeenCalled();
		expect(mocks.cloud.fetchUserCloudAccount).not.toHaveBeenCalled();
	});

	it('resets when the same user loses ownership', async () => {
		mocks.request.mockResolvedValue(assigned());
		await start();
		reactive(mocks.users).isInstanceOwner = false;
		await nextTick();
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(false);
		await vi.advanceTimersByTimeAsync(120_000);
		expect(mocks.request).toHaveBeenCalledTimes(1);
	});
	it.each([
		{ name: 'control', state: assigned() },
		{ name: 'completed treatment', state: assigned(true) },
		{ name: 'inactive', state: { status: 'inactive' } },
		{ name: 'excluded', state: { status: 'excluded' } },
	])('does not start polling for $name users', async ({ name, state }) => {
		if (name === 'control') mocks.flags.variant = 'control';
		mocks.request.mockResolvedValue(state);
		await start();
		await vi.advanceTimersByTimeAsync(180_000);
		expect(mocks.request).toHaveBeenCalledTimes(1);
	});

	it('stops as soon as a waiting user receives control', async () => {
		mocks.flags.variant = 'control';
		mocks.request.mockResolvedValueOnce(waiting).mockResolvedValue(assigned());
		await start();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(mocks.request).toHaveBeenCalledTimes(2);
		expect(useMcpDiscoveryStore().currentVariant).toBe('control');
		await vi.advanceTimersByTimeAsync(180_000);
		expect(mocks.request).toHaveBeenCalledTimes(2);
	});

	it.each([
		{},
		{ surveyId: 'unsupported-survey' },
		{ surveyId: 'x0RS6StY' },
		{ surveyId: 'x0RS6StY', do_you_use_agents: ['ChatGPT'] },
	])('stops polling after a saved survey excludes the user: %j', async (information) => {
		mocks.cloud.currentUserCloudInfo = null;
		mocks.cloud.fetchUserCloudAccount.mockImplementation(async () => {
			mocks.cloud.currentUserCloudInfo = { information };
		});
		mocks.request.mockImplementation(async ({ data }) => ({
			status: data.pickedClaude === false ? 'excluded' : 'unknown',
		}));
		await start();
		expect(mocks.request.mock.calls[0]?.[0].data.pickedClaude).toBe(false);
		expect(useMcpDiscoveryStore().state.status).toBe('excluded');
		await vi.advanceTimersByTimeAsync(180_000);
		expect(mocks.request).toHaveBeenCalledTimes(1);
		expect(mocks.cloud.fetchUserCloudAccount).toHaveBeenCalledTimes(1);
	});

	it('keeps treatment current through connection, then stops after successful MCP use', async () => {
		mocks.request
			.mockResolvedValueOnce(waiting)
			.mockResolvedValueOnce(assigned())
			.mockResolvedValueOnce({ ...assigned(), hasConnectedClaude: true })
			.mockResolvedValue(assigned(true));
		await start();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(true);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(useMcpDiscoveryStore().ctaStage).toBe('build_in_claude');
		await vi.advanceTimersByTimeAsync(60_000);
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(false);
		expect(mocks.request).toHaveBeenCalledTimes(4);
		await vi.advanceTimersByTimeAsync(180_000);
		expect(mocks.request).toHaveBeenCalledTimes(4);
	});

	it('retries the Cloud plan after a failure without a page reload', async () => {
		mocks.cloud.getOwnerCurrentPlan.mockRejectedValueOnce(new Error('Unavailable'));
		mocks.request.mockResolvedValueOnce({ status: 'unknown' }).mockResolvedValue(assigned());
		await start();
		expect(useMcpDiscoveryStore().state.status).toBe('unknown');
		expect(mocks.request).toHaveBeenCalledTimes(1);
		expect(mocks.request.mock.calls[0]?.[0].data.isTrial).toBeUndefined();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(mocks.cloud.getOwnerCurrentPlan).toHaveBeenCalledTimes(2);
		expect(useMcpDiscoveryStore().state.status).toBe('assigned');
		await vi.advanceTimersByTimeAsync(120_000);
		expect(mocks.cloud.getOwnerCurrentPlan).toHaveBeenCalledTimes(2);
	});

	it('retries an unavailable eligibility check', async () => {
		mocks.request.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue(assigned());
		await start();
		expect(useMcpDiscoveryStore().state.status).toBe('unknown');
		await vi.advanceTimersByTimeAsync(60_000);
		expect(useMcpDiscoveryStore().state.status).toBe('assigned');
		expect(mocks.request).toHaveBeenCalledTimes(2);
	});

	it.each([
		{ name: 'waiting', state: waiting },
		{ name: 'treatment', state: assigned() },
	])('keeps polling through an unknown response for $name users', async ({ state }) => {
		mocks.request
			.mockResolvedValueOnce(state)
			.mockResolvedValueOnce({ status: 'unknown' })
			.mockResolvedValueOnce({ status: 'unknown' })
			.mockResolvedValue(assigned());
		await start();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(mocks.request).toHaveBeenCalledTimes(3);
		expect(useMcpDiscoveryStore().state.status).toBe('unknown');
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(false);

		await vi.advanceTimersByTimeAsync(60_000);
		expect(mocks.request).toHaveBeenCalledTimes(4);
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(true);
	});

	it('backs off repeated unknown responses and returns to minute polling after recovery', async () => {
		mocks.request.mockResolvedValue({ status: 'unknown' });
		await start();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(mocks.request).toHaveBeenCalledTimes(3);
		await vi.advanceTimersByTimeAsync(119_999);
		expect(mocks.request).toHaveBeenCalledTimes(3);
		await vi.advanceTimersByTimeAsync(1);
		expect(mocks.request).toHaveBeenCalledTimes(4);
		await vi.advanceTimersByTimeAsync(240_000);
		expect(mocks.request).toHaveBeenCalledTimes(5);
		await vi.advanceTimersByTimeAsync(300_000);
		expect(mocks.request).toHaveBeenCalledTimes(6);
		mocks.request.mockResolvedValueOnce(waiting).mockResolvedValue(assigned());
		await vi.advanceTimersByTimeAsync(300_000);
		expect(useMcpDiscoveryStore().state.status).toBe('waiting');
		await vi.advanceTimersByTimeAsync(60_000);
		expect(useMcpDiscoveryStore().state.status).toBe('assigned');
	});

	it('clears the unknown retry delay when the user changes', async () => {
		mocks.request.mockResolvedValue({ status: 'unknown' });
		await start();
		await vi.advanceTimersByTimeAsync(120_000);
		mocks.request.mockResolvedValueOnce(waiting).mockResolvedValue(assigned());
		reactive(mocks.users).currentUser = { id: 'another-owner' };
		await vi.advanceTimersByTimeAsync(0);
		expect(useMcpDiscoveryStore().state.status).toBe('waiting');
		await vi.advanceTimersByTimeAsync(60_000);
		expect(useMcpDiscoveryStore().state.status).toBe('assigned');
	});

	it('resumes polling for late flags and stops when the live flag is disabled', async () => {
		mocks.flags.variant = undefined;
		mocks.request.mockResolvedValue(assigned());
		await start();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(mocks.request).toHaveBeenCalledTimes(1);
		reactive(mocks.flags).variant = 'variant';
		await nextTick();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(true);
		expect(mocks.request).toHaveBeenCalledTimes(2);
		reactive(mocks.flags).variant = false;
		await nextTick();
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(false);
		await vi.advanceTimersByTimeAsync(180_000);
		expect(mocks.request).toHaveBeenCalledTimes(2);
	});

	it('stops on sign-out and checks again for the next signed-in user', async () => {
		mocks.request.mockResolvedValue(assigned());
		await start();
		reactive(mocks.users).currentUser = undefined;
		await nextTick();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(mocks.request).toHaveBeenCalledTimes(1);
		reactive(mocks.users).currentUser = { id: 'another-member' };
		await nextTick();
		await vi.advanceTimersByTimeAsync(0);
		expect(mocks.request).toHaveBeenCalledTimes(2);
	});

	it('preserves state, polling time, and event deduplication when the user ID is unchanged', async () => {
		mocks.request.mockResolvedValue(assigned());
		await start();
		const store = useMcpDiscoveryStore();
		const state = store.state;
		store.trackEntry('sidebar', 'viewed');
		expect(mocks.track).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(30_000);

		reactive(mocks.users).currentUser = { id: 'member' };
		await nextTick();
		await vi.advanceTimersByTimeAsync(0);
		expect(store.state).toBe(state);
		expect(mocks.request).toHaveBeenCalledTimes(1);
		store.trackEntry('sidebar', 'viewed');
		expect(mocks.track).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(30_000);
		expect(mocks.request).toHaveBeenCalledTimes(2);
		expect(mocks.track).toHaveBeenCalledTimes(2);
	});

	it('starts a new exposure and view history when the user ID changes', async () => {
		mocks.request.mockResolvedValue(assigned());
		await start();
		const store = useMcpDiscoveryStore();
		store.trackEntry('sidebar', 'viewed');

		reactive(mocks.users).currentUser = { id: 'another-member' };
		await nextTick();
		await vi.advanceTimersByTimeAsync(0);
		store.trackEntry('sidebar', 'viewed');

		expect(mocks.request).toHaveBeenCalledTimes(2);
		expect(mocks.track).toHaveBeenCalledTimes(4);
	});

	it('resets and stops polling when the deployment is no longer Cloud', async () => {
		mocks.request.mockResolvedValue(assigned());
		await start();
		reactive(mocks.settings).isCloudDeployment = false;
		await nextTick();
		expect(useMcpDiscoveryStore().state.status).toBe('inactive');
		await vi.advanceTimersByTimeAsync(120_000);
		expect(mocks.request).toHaveBeenCalledTimes(1);

		reactive(mocks.settings).isCloudDeployment = true;
		await nextTick();
		await vi.advanceTimersByTimeAsync(0);
		expect(useMcpDiscoveryStore().state.status).toBe('assigned');
		expect(mocks.request).toHaveBeenCalledTimes(2);
	});
	it('waits for Cloud owner initialization and checks immediately when it is ready', async () => {
		mocks.cloud.hasCloudPlan = false;
		mocks.cloud.currentUserCloudInfo = null;
		mocks.request.mockResolvedValue(assigned());
		await start();
		expect(mocks.cloud.fetchUserCloudAccount).not.toHaveBeenCalled();
		expect(mocks.request).not.toHaveBeenCalled();
		reactive(mocks.cloud).hasCloudPlan = true;
		await nextTick();
		await vi.advanceTimersByTimeAsync(0);
		expect(mocks.cloud.fetchUserCloudAccount).toHaveBeenCalledTimes(1);
		expect(mocks.request).toHaveBeenCalledTimes(1);
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(true);
	});
});
