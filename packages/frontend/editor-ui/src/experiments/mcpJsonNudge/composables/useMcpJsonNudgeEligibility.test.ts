import { EXPERIMENTS_TO_TRACK, MCP_JSON_NUDGE_EXPERIMENT } from '@/app/constants/experiments';
import { MCP_JSON_NUDGE_CALLOUT } from '@/experiments/mcpJsonNudge/constants';

const mockMcpStore = vi.hoisted(() => ({ mcpAccessEnabled: false }));
const mockIsFeatureEnabled = vi.hoisted(() => vi.fn());
const mockIsCalloutDismissed = vi.hoisted(() => vi.fn());
const mockSetCalloutDismissed = vi.hoisted(() => vi.fn());
const mockCurrentUser = vi.hoisted<{ settings: Record<string, unknown> }>(() => ({ settings: {} }));
const mockUpdateCurrentUserSettings = vi.hoisted(() => vi.fn());

vi.mock('@/features/ai/mcpAccess/mcp.store', () => ({
	useMCPStore: () => mockMcpStore,
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: mockIsFeatureEnabled }),
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({
		currentUser: mockCurrentUser,
		isCalloutDismissed: mockIsCalloutDismissed,
		setCalloutDismissed: mockSetCalloutDismissed,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

vi.mock('@n8n/rest-api-client/api/users', () => ({
	updateCurrentUserSettings: mockUpdateCurrentUserSettings,
}));

import { useMcpJsonNudgeEligibility } from './useMcpJsonNudgeEligibility';

describe('useMcpJsonNudgeEligibility', () => {
	beforeEach(() => {
		mockMcpStore.mcpAccessEnabled = false;
		mockIsFeatureEnabled.mockReset().mockReturnValue(true);
		mockIsCalloutDismissed.mockReset().mockReturnValue(false);
		mockSetCalloutDismissed.mockClear();
		mockCurrentUser.settings = {};
		mockUpdateCurrentUserSettings.mockClear();
	});

	it('is registered in EXPERIMENTS_TO_TRACK', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(MCP_JSON_NUDGE_EXPERIMENT.name);
	});

	describe('canShow', () => {
		it('returns true when every condition is favorable (baseline)', () => {
			const { canShow } = useMcpJsonNudgeEligibility();

			expect(canShow()).toBe(true);
		});

		it('returns false when MCP is already enabled for the instance', () => {
			mockMcpStore.mcpAccessEnabled = true;
			const { canShow } = useMcpJsonNudgeEligibility();

			expect(canShow()).toBe(false);
		});

		it('returns false when the feature flag is off', () => {
			mockIsFeatureEnabled.mockReturnValue(false);
			const { canShow } = useMcpJsonNudgeEligibility();

			expect(canShow()).toBe(false);
		});

		it('returns false when the user dismissed it forever', () => {
			mockIsCalloutDismissed.mockReturnValue(true);
			const { canShow } = useMcpJsonNudgeEligibility();

			expect(canShow()).toBe(false);
		});

		// Boundary value analysis on the impression cap (< 2): 0 and 1 are
		// inside the accepted range, 2 is the boundary itself (first
		// rejected value), 3 is outside range, and a missing count is a
		// distinct equivalence class (no prior impressions recorded) that
		// must be treated the same as 0, not as invalid/false.
		it.each([
			[undefined, true, 'missing impressions count (treated as zero)'],
			[0, true, 'zero impressions (lower bound of the valid range)'],
			[1, true, 'one impression (just below the cap)'],
			[2, false, 'two impressions (the cap itself, first rejected value)'],
			[3, false, 'three impressions (above the cap)'],
		] as const)('impressions=%s -> %s (%s)', (impressions, expected, _label) => {
			mockCurrentUser.settings = impressions === undefined ? {} : { mcpJsonNudge: { impressions } };
			const { canShow } = useMcpJsonNudgeEligibility();

			expect(canShow()).toBe(expected);
		});
	});

	describe('recordImpression', () => {
		it('persists 1 when there was no prior impressions count', async () => {
			mockCurrentUser.settings = {};
			const { recordImpression } = useMcpJsonNudgeEligibility();

			await recordImpression();

			expect(mockUpdateCurrentUserSettings).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ mcpJsonNudge: { impressions: 1 } }),
			);
		});

		it('increments an existing impressions count', async () => {
			mockCurrentUser.settings = { mcpJsonNudge: { impressions: 1 } };
			const { recordImpression } = useMcpJsonNudgeEligibility();

			await recordImpression();

			expect(mockUpdateCurrentUserSettings).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ mcpJsonNudge: { impressions: 2 } }),
			);
		});
	});

	describe('dismissForever', () => {
		it('dismisses the MCP JSON nudge callout, preserving other dismissed callouts', async () => {
			mockCurrentUser.settings = { dismissedCallouts: { someOtherCallout: true } };
			const { dismissForever } = useMcpJsonNudgeEligibility();

			await dismissForever();

			expect(mockSetCalloutDismissed).toHaveBeenCalledWith(MCP_JSON_NUDGE_CALLOUT);
			expect(mockUpdateCurrentUserSettings).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					dismissedCallouts: { someOtherCallout: true, [MCP_JSON_NUDGE_CALLOUT]: true },
				}),
			);
		});
	});
});
