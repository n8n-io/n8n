import { EXPERIMENTS_TO_TRACK, MCP_JSON_NUDGE_EXPERIMENT } from '@/app/constants/experiments';
import { MCP_JSON_NUDGE_CALLOUT } from '@/experiments/mcpJsonNudge/constants';

const mockMcpStore = vi.hoisted(() => ({ mcpAccessEnabled: false }));
const mockIsVariantEnabled = vi.hoisted(() => vi.fn());
const mockIsCalloutDismissed = vi.hoisted(() => vi.fn());
const mockSetCalloutDismissed = vi.hoisted(() => vi.fn());
const mockCurrentUser = vi.hoisted<{ settings: Record<string, unknown> }>(() => ({ settings: {} }));
const mockUpdateUserSettings = vi.hoisted(() => vi.fn());

vi.mock('@/features/ai/mcpAccess/mcp.store', () => ({
	useMCPStore: () => mockMcpStore,
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isVariantEnabled: mockIsVariantEnabled }),
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({
		currentUser: mockCurrentUser,
		isCalloutDismissed: mockIsCalloutDismissed,
		setCalloutDismissed: mockSetCalloutDismissed,
		updateUserSettings: mockUpdateUserSettings,
	}),
}));

import { useMcpJsonNudgeEligibility } from './useMcpJsonNudgeEligibility';

describe('useMcpJsonNudgeEligibility', () => {
	beforeEach(() => {
		mockMcpStore.mcpAccessEnabled = false;
		mockIsVariantEnabled.mockReset().mockReturnValue(true);
		mockIsCalloutDismissed.mockReset().mockReturnValue(false);
		mockSetCalloutDismissed.mockClear();
		mockCurrentUser.settings = {};
		mockUpdateUserSettings.mockClear();
	});

	it('is registered in EXPERIMENTS_TO_TRACK', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(MCP_JSON_NUDGE_EXPERIMENT.name);
	});

	// The PostHog flag is multivariate, and its enabled arm is the variant key
	// `variant`, matching every other multivariate experiment here. A drift
	// between this spelling and the flag's would make the nudge unreachable for
	// every user, with no error to show for it.
	it("names the flag's enabled arm `variant`", () => {
		expect(MCP_JSON_NUDGE_EXPERIMENT.variant).toBe('variant');
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

		it('asks PostHog whether the user is in the enabled variant of the flag', () => {
			const { canShow } = useMcpJsonNudgeEligibility();

			canShow();

			expect(mockIsVariantEnabled).toHaveBeenCalledWith(
				MCP_JSON_NUDGE_EXPERIMENT.name,
				MCP_JSON_NUDGE_EXPERIMENT.variant,
			);
		});

		it('returns false when the user is not in the enabled variant (control or unassigned)', () => {
			mockIsVariantEnabled.mockReturnValue(false);
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

	// The exposed population of the experiment: everyone who would see the nudge
	// but for their arm. The trigger reports exposure off this, so it must NOT
	// consult the flag.
	describe('isEligibleApartFromExperiment', () => {
		it('ignores the experiment arm', () => {
			mockIsVariantEnabled.mockReturnValue(false);
			const { isEligibleApartFromExperiment } = useMcpJsonNudgeEligibility();

			expect(isEligibleApartFromExperiment()).toBe(true);
			expect(mockIsVariantEnabled).not.toHaveBeenCalled();
		});

		it.each([
			['MCP is already enabled for the instance', () => (mockMcpStore.mcpAccessEnabled = true)],
			[
				'the impression cap is reached',
				() => (mockCurrentUser.settings = { mcpJsonNudge: { impressions: 2 } }),
			],
			['the user opted out', () => mockIsCalloutDismissed.mockReturnValue(true)],
		])('returns false when %s', (_label, arrange) => {
			arrange();
			const { isEligibleApartFromExperiment } = useMcpJsonNudgeEligibility();

			expect(isEligibleApartFromExperiment()).toBe(false);
		});
	});

	describe('recordImpression', () => {
		it('persists 1 when there was no prior impressions count', async () => {
			mockCurrentUser.settings = {};
			const { recordImpression } = useMcpJsonNudgeEligibility();

			await recordImpression();

			expect(mockUpdateUserSettings).toHaveBeenCalledWith({ mcpJsonNudge: { impressions: 1 } });
		});

		it('increments an existing impressions count', async () => {
			mockCurrentUser.settings = { mcpJsonNudge: { impressions: 1 } };
			const { recordImpression } = useMcpJsonNudgeEligibility();

			await recordImpression();

			expect(mockUpdateUserSettings).toHaveBeenCalledWith({ mcpJsonNudge: { impressions: 2 } });
		});
	});

	describe('dismissForever', () => {
		it('dismisses the MCP JSON nudge callout, preserving other dismissed callouts', async () => {
			mockCurrentUser.settings = { dismissedCallouts: { someOtherCallout: true } };
			const { dismissForever } = useMcpJsonNudgeEligibility();

			await dismissForever();

			expect(mockSetCalloutDismissed).toHaveBeenCalledWith(MCP_JSON_NUDGE_CALLOUT);
			expect(mockUpdateUserSettings).toHaveBeenCalledWith({
				dismissedCallouts: { someOtherCallout: true, [MCP_JSON_NUDGE_CALLOUT]: true },
			});
		});
	});
});
