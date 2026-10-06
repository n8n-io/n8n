import { reactive } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { MCP_DISCOVERY_EXPERIMENT } from '@/app/constants/experiments';

import { useMcpDiscoveryStore } from './mcpDiscovery.store';

const mocks = vi.hoisted(() => ({
	request: vi.fn(),
	cloud: {
		currentUserCloudInfo: null as { information?: Record<string, unknown> } | null,
		fetchUserCloudAccount: vi.fn(),
	},
	track: vi.fn(),
	setAssignment: vi.fn(),
	getVariant: vi.fn(),
	users: { isInstanceOwner: true, currentUser: { id: 'member' } },
	settings: { moduleSettings: { mcp: { mcpAccessEnabled: false } } },
}));

vi.mock('@n8n/stores/cloudPlan.store', () => ({ useCloudPlanStore: () => mocks.cloud }));
vi.mock('@n8n/stores/settings.store', () => ({ useSettingsStore: () => reactive(mocks.settings) }));
// Keep the REST client real so tests cover the controller's response envelope.
vi.mock('axios', () => ({
	default: {
		request: async (options: unknown) => ({ data: { data: await mocks.request(options) } }),
	},
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));
vi.mock('@n8n/stores/users.store', () => ({ useUsersStore: () => mocks.users }));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track: mocks.track }) }));
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		setMcpDiscoveryAssignment: mocks.setAssignment,
		getVariant: mocks.getVariant,
	}),
}));

describe('MCP discovery store', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.users.isInstanceOwner = true;
		mocks.cloud.currentUserCloudInfo = {
			information: {
				surveyId: 'OArzTwNz',
				'6fe33101-6331-4088-b54f-ae4afe727f96': ['Claude (incl. Claude Code)'],
			},
		};
		setActivePinia(createPinia());
		mocks.users.currentUser = { id: 'member' };
		mocks.settings.moduleSettings.mcp.mcpAccessEnabled = false;
	});

	it.each(['control', 'variant'] as const)(
		'records exposure for eligible %s users',
		async (variant) => {
			mocks.request.mockResolvedValue({
				status: 'assigned',
				assignment: { variant, assignedAt: 123 },
				coachmarkDismissed: false,
			});
			const store = useMcpDiscoveryStore();
			await store.refresh();
			expect(store.isEnabled).toBe(true);
			expect(store.isTreatment).toBe(variant === 'variant');
			expect(mocks.setAssignment).toHaveBeenCalledWith(variant);
			expect(mocks.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.MCP.DISCOVERY_EXPOSED,
				expect.objectContaining({
					variant,
					[`$feature/${MCP_DISCOVERY_EXPERIMENT.name}`]: variant,
				}),
			);
			await store.refresh();
			expect(mocks.track).toHaveBeenCalledTimes(1);
		},
	);

	it('does not expose unknown users or show treatment on request failure', async () => {
		mocks.request.mockRejectedValue(new Error('Unavailable'));
		const store = useMcpDiscoveryStore();
		await store.refresh();
		expect(store.isEnabled).toBe(false);
		expect(store.isTreatment).toBe(false);
		expect(mocks.track).not.toHaveBeenCalled();
	});

	it('reads the existing Cloud account API once and sends only the Claude choice', async () => {
		mocks.cloud.currentUserCloudInfo = null;
		mocks.cloud.fetchUserCloudAccount.mockImplementation(async () => {
			mocks.cloud.currentUserCloudInfo = {
				information: {
					surveyId: 'x0RS6StY',
					do_you_use_agents: ['ChatGPT', 'Claude (incl. Claude Code)'],
				},
			};
		});
		mocks.request.mockResolvedValue({ status: 'waiting', coachmarkDismissed: false });
		const store = useMcpDiscoveryStore();
		await store.refresh();
		mocks.cloud.currentUserCloudInfo = null;
		await store.refresh();

		expect(mocks.cloud.fetchUserCloudAccount).toHaveBeenCalledTimes(1);
		expect(mocks.request).toHaveBeenCalledTimes(2);
		expect(mocks.request).toHaveBeenLastCalledWith(
			expect.objectContaining({
				url: '/me/mcp-discovery/visit',
				data: { pickedClaude: true },
			}),
		);
	});

	it('does not request Cloud data or enrollment for a non-owner', async () => {
		mocks.users.isInstanceOwner = false;
		mocks.cloud.currentUserCloudInfo = null;
		await useMcpDiscoveryStore().refresh();

		expect(mocks.cloud.fetchUserCloudAccount).not.toHaveBeenCalled();
		expect(mocks.request).not.toHaveBeenCalled();
		expect(mocks.track).not.toHaveBeenCalled();
	});

	it('retries an unavailable Cloud account instead of inferring a negative answer', async () => {
		mocks.cloud.currentUserCloudInfo = null;
		mocks.cloud.fetchUserCloudAccount.mockRejectedValueOnce(new Error('Unavailable'));
		const store = useMcpDiscoveryStore();
		await store.refresh();
		expect(store.state.status).toBe('unknown');
		expect(mocks.request).not.toHaveBeenCalled();

		mocks.cloud.fetchUserCloudAccount.mockImplementation(async () => {
			mocks.cloud.currentUserCloudInfo = {
				information: { surveyId: 'x0RS6StY', do_you_use_agents: ['ChatGPT'] },
			};
		});
		mocks.request.mockResolvedValue({ status: 'excluded', coachmarkDismissed: false });
		await store.refresh();
		expect(mocks.request).toHaveBeenLastCalledWith(
			expect.objectContaining({ data: { pickedClaude: false } }),
		);
		expect(store.state.status).toBe('excluded');
	});

	it('retries a missing survey answer on a later visit', async () => {
		mocks.cloud.currentUserCloudInfo = { information: {} };
		mocks.request.mockResolvedValue({ status: 'unknown', coachmarkDismissed: false });
		const store = useMcpDiscoveryStore();
		await store.refresh();
		expect(mocks.request).toHaveBeenLastCalledWith(expect.objectContaining({ data: {} }));

		mocks.cloud.fetchUserCloudAccount.mockImplementation(async () => {
			mocks.cloud.currentUserCloudInfo = {
				information: { surveyId: 'x0RS6StY', do_you_use_agents: ['Claude (incl. Claude Code)'] },
			};
		});
		await store.refresh();
		expect(mocks.request).toHaveBeenLastCalledWith(
			expect.objectContaining({ data: { pickedClaude: true } }),
		);
	});
	it('tracks visible placements once and clicks with experiment metadata', async () => {
		mocks.request.mockResolvedValue({
			status: 'assigned',
			assignment: { variant: 'variant', assignedAt: 123 },
			coachmarkDismissed: false,
		});
		const store = useMcpDiscoveryStore();
		await store.refresh();
		store.trackEntry('sidebar', 'viewed');
		store.trackEntry('sidebar', 'viewed');
		store.trackEntry('sidebar', 'clicked');
		expect(mocks.track).toHaveBeenCalledTimes(3);
		expect(mocks.track).toHaveBeenLastCalledWith(
			TELEMETRY_EVENT.MCP.DISCOVERY_ENTRY_CLICKED,
			expect.objectContaining({
				surface: 'sidebar',
				cta_stage: 'build',
				[`$feature/${MCP_DISCOVERY_EXPERIMENT.name}`]: 'variant',
			}),
		);
	});

	it('persists explicit dismissal through the authenticated endpoint', async () => {
		mocks.request
			.mockResolvedValueOnce({
				status: 'assigned',
				assignment: { variant: 'variant', assignedAt: 123 },
				coachmarkDismissed: false,
			})
			.mockResolvedValueOnce({ success: true });
		const store = useMcpDiscoveryStore();
		await store.refresh();
		await store.dismissCoachmark();
		expect(mocks.request).toHaveBeenLastCalledWith(
			expect.objectContaining({
				baseURL: '/rest',
				method: 'POST',
				url: '/me/mcp-discovery/dismiss',
			}),
		);
		expect(store.coachmarkDismissed).toBe(true);
	});

	it('advances the CTA through enable and Claude connection states', async () => {
		const store = useMcpDiscoveryStore();
		expect(store.ctaStage).toBe('build');
		reactive(mocks.settings).moduleSettings.mcp.mcpAccessEnabled = true;
		// Use a reactive store update to recompute with the changed settings mock.
		store.state = {
			status: 'assigned',
			assignment: { variant: 'variant', assignedAt: 1 },
			coachmarkDismissed: false,
			hasConnectedClaude: false,
		};
		expect(store.ctaStage).toBe('connect');
		store.state.hasConnectedClaude = true;
		expect(store.ctaStage).toBe('build_in_claude');
	});

	it('preserves a successful dismissal when an earlier visit response arrives', async () => {
		const store = useMcpDiscoveryStore();
		store.state = {
			status: 'assigned',
			assignment: { variant: 'variant', assignedAt: 123 },
			coachmarkDismissed: false,
		};
		const visit = Promise.withResolvers<unknown>();
		mocks.request.mockReturnValueOnce(visit.promise).mockResolvedValueOnce({ success: true });
		const refresh = store.refresh();
		await store.dismissCoachmark();

		visit.resolve({
			status: 'assigned',
			assignment: { variant: 'variant', assignedAt: 123 },
			coachmarkDismissed: false,
			hasConnectedClaude: true,
		});
		await refresh;

		expect(store.coachmarkDismissed).toBe(true);
		expect(store.state.hasConnectedClaude).toBe(true);
	});

	it('ignores a dismissal response after a reset for the same user', async () => {
		const store = useMcpDiscoveryStore();
		store.state = {
			status: 'assigned',
			assignment: { variant: 'variant', assignedAt: 123 },
			coachmarkDismissed: false,
		};
		const request = Promise.withResolvers<unknown>();
		mocks.request.mockReturnValueOnce(request.promise);
		const dismissal = store.dismissCoachmark();
		store.reset();
		request.resolve({ success: true });
		await dismissal;

		expect(store.state).toEqual({ status: 'inactive', coachmarkDismissed: false });
	});

	it('hides entries after Claude use while retaining experiment enrollment', async () => {
		mocks.request.mockResolvedValue({
			status: 'assigned',
			assignment: { variant: 'variant', assignedAt: 1 },
			coachmarkDismissed: false,
			hasConnectedClaude: true,
			hasUsedClaudeMcp: true,
		});
		const store = useMcpDiscoveryStore();
		await store.refresh();
		expect(store.isEnabled).toBe(true);
		expect(store.shouldShowEntryPoints).toBe(false);
	});

	it('ignores an old response after a user change', async () => {
		let resolve: (value: unknown) => void = () => {};
		mocks.request.mockImplementation(
			() =>
				new Promise((done) => {
					resolve = done;
				}),
		);
		const store = useMcpDiscoveryStore();
		const pending = store.refresh();
		store.reset();
		mocks.users.currentUser = { id: 'other' };
		resolve({
			status: 'assigned',
			assignment: { variant: 'variant', assignedAt: 123 },
			coachmarkDismissed: false,
		});
		await pending;
		expect(store.isEnabled).toBe(false);
		expect(mocks.track).not.toHaveBeenCalled();
	});
	it.each(['build', 'connect', 'build_in_claude'] as const)(
		'tracks the surface and %s CTA stage on clicks',
		async (stage) => {
			mocks.settings.moduleSettings.mcp.mcpAccessEnabled = stage !== 'build';
			mocks.request.mockResolvedValue({
				status: 'assigned',
				assignment: { variant: 'variant', assignedAt: 123 },
				coachmarkDismissed: false,
				hasConnectedClaude: stage === 'build_in_claude',
			});
			const store = useMcpDiscoveryStore();
			await store.refresh();
			store.trackEntry('canvas', 'clicked');
			expect(mocks.track).toHaveBeenLastCalledWith(
				TELEMETRY_EVENT.MCP.DISCOVERY_ENTRY_CLICKED,
				expect.objectContaining({ surface: 'canvas', cta_stage: stage }),
			);
			expect(mocks.track.mock.lastCall?.[1]).not.toHaveProperty('placement');
		},
	);
});
