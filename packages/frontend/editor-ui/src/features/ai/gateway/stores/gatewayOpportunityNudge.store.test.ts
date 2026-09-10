import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useUsersStore } from '@n8n/stores/users.store';

import { mockedStore } from '@/__tests__/utils';
import {
	GATEWAY_OPPORTUNITY_CALLOUT_KEY,
	GATEWAY_OPPORTUNITY_OPT_OUT_KEY,
	useGatewayOpportunityNudgeStore,
} from './gatewayOpportunityNudge.store';

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@n8n/rest-api-client/api/users', () => ({
	updateCurrentUserSettings: vi.fn().mockResolvedValue({}),
}));

describe('gatewayOpportunityNudge.store', () => {
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

	/** One mock now serves both callout keys — dismiss only the ones named. */
	const dismissCallouts = (...keys: string[]) => {
		usersStore.isCalloutDismissed.mockImplementation((key: string) => keys.includes(key));
	};

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		usersStore = mockedStore(useUsersStore);
		usersStore.currentUser = { id: 'u1', settings: {} } as never;
		dismissCallouts();
	});

	describe('shouldShow', () => {
		it('is false when there are no opportunities', () => {
			const store = useGatewayOpportunityNudgeStore();
			expect(store.shouldShow(0, 'wf1')).toBe(false);
		});

		it('is true when there are opportunities and the user has not opted out', () => {
			const store = useGatewayOpportunityNudgeStore();
			expect(store.shouldShow(2, 'wf1')).toBe(true);
		});

		it('is false once the user has opted out', () => {
			dismissCallouts(GATEWAY_OPPORTUNITY_OPT_OUT_KEY);
			const store = useGatewayOpportunityNudgeStore();
			expect(store.shouldShow(2, 'wf1')).toBe(false);
		});

		it('is false after the nudge already showed for this workflow', () => {
			const store = useGatewayOpportunityNudgeStore();
			store.markShown(2, 'wf1');
			expect(store.shouldShow(2, 'wf1')).toBe(false);
		});

		it('still shows for a different workflow in the same session', () => {
			const store = useGatewayOpportunityNudgeStore();
			store.markShown(2, 'wf1');

			// A cap for the whole session would let the first workflow the user
			// opens silence every other one.
			expect(store.shouldShow(2, 'wf2')).toBe(true);
		});
	});

	describe('markShown', () => {
		it('tracks the shown event with the opportunity count and workflow id', () => {
			const store = useGatewayOpportunityNudgeStore();
			store.markShown(3, 'wf1');
			expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.GATEWAY.OPPORTUNITY_NUDGE_SHOWN, {
				workflow_id: 'wf1',
				opportunity_count: 3,
			});
		});
	});

	describe('dismiss', () => {
		it('writes the callout key alongside existing dismissed callouts and tracks the action', async () => {
			usersStore.currentUser = {
				id: 'u1',
				settings: { dismissedCallouts: { 'other-callout': true } },
			} as never;
			const store = useGatewayOpportunityNudgeStore();

			await store.dismiss('wf1');

			expect(updateCurrentUserSettings).toHaveBeenCalledWith(expect.anything(), {
				dismissedCallouts: {
					'other-callout': true,
					[GATEWAY_OPPORTUNITY_CALLOUT_KEY]: true,
				},
			});
			expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.GATEWAY.OPPORTUNITY_NUDGE_ACTIONED, {
				workflow_id: 'wf1',
				method: 'dismiss',
			});
		});

		// This is the test-worthy bug the spec calls out: omitting the spread of the
		// existing dismissedCallouts map would wipe every other dismissed callout,
		// since updateUserSettings does a shallow Object.assign server-side.
		it('does not drop unrelated dismissed callouts already set on the user', async () => {
			usersStore.currentUser = {
				id: 'u1',
				settings: {
					dismissedCallouts: {
						'unrelated-callout-a': true,
						'unrelated-callout-b': true,
					},
				},
			} as never;
			const store = useGatewayOpportunityNudgeStore();

			await store.dismiss('wf1');

			const [, payload] = vi.mocked(updateCurrentUserSettings).mock.calls[0];
			expect(payload.dismissedCallouts).toMatchObject({
				'unrelated-callout-a': true,
				'unrelated-callout-b': true,
				[GATEWAY_OPPORTUNITY_CALLOUT_KEY]: true,
			});
		});
	});

	describe('actionReviewAndSwitch', () => {
		it('tracks the action with the offered count, without persisting a dismissed callout', () => {
			const store = useGatewayOpportunityNudgeStore();

			store.actionReviewAndSwitch('wf1', 3);

			expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.GATEWAY.OPPORTUNITY_NUDGE_ACTIONED, {
				workflow_id: 'wf1',
				method: 'review_and_switch',
				offered_count: 3,
			});
			expect(updateCurrentUserSettings).not.toHaveBeenCalled();
		});
	});

	describe('neverShowAgain', () => {
		it('writes the opt-out key alongside existing dismissed callouts and tracks the action', async () => {
			usersStore.currentUser = {
				id: 'u1',
				settings: { dismissedCallouts: { 'other-callout': true } },
			} as never;
			const store = useGatewayOpportunityNudgeStore();

			await store.neverShowAgain('wf1');

			expect(updateCurrentUserSettings).toHaveBeenCalledWith(expect.anything(), {
				dismissedCallouts: {
					'other-callout': true,
					[GATEWAY_OPPORTUNITY_OPT_OUT_KEY]: true,
				},
			});
			expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.GATEWAY.OPPORTUNITY_NUDGE_ACTIONED, {
				workflow_id: 'wf1',
				method: 'never_show_again',
			});
		});
	});
});
