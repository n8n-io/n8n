import type { McpDiscoveryState } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick, reactive } from 'vue';

import { useMcpDiscoveryEnrollment } from './useMcpDiscovery';
import { useMcpDiscoveryStore } from './mcpDiscovery.store';

const mocks = vi.hoisted(() => ({
	request: vi.fn(),
	cloud: {
		hasCloudPlan: true,
		currentUserCloudInfo: null as { information?: Record<string, unknown> } | null,
		fetchUserCloudAccount: vi.fn(),
	},
	track: vi.fn(),
	users: { isInstanceOwner: true, currentUser: { id: 'member' } as { id: string } | undefined },
	settings: { isCloudDeployment: true, moduleSettings: { mcp: { mcpAccessEnabled: true } } },
}));

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
	usePostHog: () => ({ setMcpDiscoveryAssignment: vi.fn(), getVariant: vi.fn() }),
}));

const assigned = (variant: 'control' | 'variant', hasUsedClaudeMcp = false): McpDiscoveryState => ({
	status: 'assigned',
	assignment: { variant, assignedAt: 123 },
	coachmarkDismissed: false,
	hasUsedClaudeMcp,
});
const waiting: McpDiscoveryState = { status: 'waiting', coachmarkDismissed: false };

describe('MCP discovery enrollment polling', () => {
	let scope: ReturnType<typeof effectScope>;

	beforeEach(() => {
		vi.resetAllMocks();
		mocks.users.isInstanceOwner = true;
		mocks.cloud.hasCloudPlan = true;
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
		vi.useRealTimers();
	});

	async function start() {
		scope.run(useMcpDiscoveryEnrollment);
		await vi.advanceTimersByTimeAsync(0);
	}

	it('does not start requests or polling for a non-owner', async () => {
		mocks.users.isInstanceOwner = false;
		await start();
		await vi.advanceTimersByTimeAsync(180_000);
		expect(mocks.request).not.toHaveBeenCalled();
		expect(mocks.cloud.fetchUserCloudAccount).not.toHaveBeenCalled();
	});

	it('resets when the same user loses ownership', async () => {
		mocks.request.mockResolvedValue(assigned('variant'));
		await start();
		reactive(mocks.users).isInstanceOwner = false;
		await nextTick();
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(false);
		await vi.advanceTimersByTimeAsync(120_000);
		expect(mocks.request).toHaveBeenCalledTimes(1);
	});
	it.each([
		{ name: 'control', state: assigned('control') },
		{ name: 'completed treatment', state: assigned('variant', true) },
		{ name: 'inactive', state: { status: 'inactive', coachmarkDismissed: false } },
		{ name: 'excluded', state: { status: 'excluded', coachmarkDismissed: false } },
	])('does not start polling for $name users', async ({ state }) => {
		mocks.request.mockResolvedValue(state);
		await start();
		await vi.advanceTimersByTimeAsync(180_000);
		expect(mocks.request).toHaveBeenCalledTimes(1);
	});

	it('stops as soon as a waiting user receives control', async () => {
		mocks.request.mockResolvedValueOnce(waiting).mockResolvedValue(assigned('control'));
		await start();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(mocks.request).toHaveBeenCalledTimes(2);
		expect(useMcpDiscoveryStore().currentVariant).toBe('control');
		await vi.advanceTimersByTimeAsync(180_000);
		expect(mocks.request).toHaveBeenCalledTimes(2);
	});

	it('keeps treatment current through connection, then stops after successful Claude use', async () => {
		mocks.request
			.mockResolvedValueOnce(waiting)
			.mockResolvedValueOnce(assigned('variant'))
			.mockResolvedValueOnce({ ...assigned('variant'), hasConnectedClaude: true })
			.mockResolvedValue(assigned('variant', true));
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

	it('retries an unavailable eligibility check', async () => {
		mocks.request
			.mockRejectedValueOnce(new Error('Unavailable'))
			.mockResolvedValue(assigned('control'));
		await start();
		expect(useMcpDiscoveryStore().state.status).toBe('unknown');
		await vi.advanceTimersByTimeAsync(60_000);
		expect(useMcpDiscoveryStore().state.status).toBe('assigned');
		expect(mocks.request).toHaveBeenCalledTimes(2);
	});

	it.each([
		{ name: 'waiting', state: waiting },
		{ name: 'treatment', state: assigned('variant') },
	])('keeps polling through an unknown response for $name users', async ({ state }) => {
		mocks.request
			.mockResolvedValueOnce(state)
			.mockResolvedValueOnce({ status: 'unknown', coachmarkDismissed: false })
			.mockResolvedValueOnce({ status: 'unknown', coachmarkDismissed: false })
			.mockResolvedValue(assigned('variant'));
		await start();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(mocks.request).toHaveBeenCalledTimes(3);
		expect(useMcpDiscoveryStore().state.status).toBe('unknown');
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(false);

		await vi.advanceTimersByTimeAsync(60_000);
		expect(mocks.request).toHaveBeenCalledTimes(4);
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(true);
	});

	it('stops polling when the flag is disabled after treatment assignment', async () => {
		mocks.request
			.mockResolvedValueOnce(assigned('variant'))
			.mockResolvedValue({ status: 'inactive', coachmarkDismissed: false });
		await start();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(useMcpDiscoveryStore().shouldShowEntryPoints).toBe(false);
		await vi.advanceTimersByTimeAsync(180_000);
		expect(mocks.request).toHaveBeenCalledTimes(2);
	});

	it('stops on sign-out and checks again for the next signed-in user', async () => {
		mocks.request.mockResolvedValue(assigned('variant'));
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
		mocks.request.mockResolvedValue(assigned('variant'));
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
		mocks.request.mockResolvedValue(assigned('variant'));
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
		mocks.request.mockResolvedValue(assigned('variant'));
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
		mocks.request.mockResolvedValue(assigned('variant'));
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
