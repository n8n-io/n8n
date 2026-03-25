import { createPinia, setActivePinia } from 'pinia';
import { CREDENTIAL_SETUP_RECIPE_EXPERIMENT } from '@/app/constants/experiments';
import type { ResolvedSetupRecipe } from '../credentialsSetup.types';
import { V1_COHORT } from '../data/v1Cohort';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the import under test
// ---------------------------------------------------------------------------

const mockTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: mockTrack,
	})),
}));

const mockGetVariant = vi.fn();
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant: mockGetVariant,
	})),
}));

const mockResolveSetupRecipe = vi.fn();
vi.mock('../composables/useRecipeResolver', () => ({
	useRecipeResolver: vi.fn(() => ({
		resolveSetupRecipe: mockResolveSetupRecipe,
	})),
}));

// ---------------------------------------------------------------------------
// Import the store under test after mocks are in place
// ---------------------------------------------------------------------------

import { useCredentialSetupRecipeStore } from './credentialSetupRecipe.store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A V1 cohort member. Must be present in V1_COHORT. */
const V1_TYPE = [...V1_COHORT][0]; // e.g. 'gmailOAuth2'

/** A credential type NOT in the V1 cohort. */
const NON_V1_TYPE = 'someObscureCredentialType_notInCohort';

function makeResolved(
	credentialType: string,
	overrides: Partial<ResolvedSetupRecipe> = {},
): ResolvedSetupRecipe {
	return {
		recipe: { setupMode: 'managedOAuth', friction: 'one_click' },
		confidence: 'high',
		confidenceReasons: ['oauth_managed_clients'],
		resolutionSource: 'explicit_override',
		credentialType,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('credentialSetupRecipe store', () => {
	let store: ReturnType<typeof useCredentialSetupRecipeStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockTrack.mockClear();
		mockGetVariant.mockReset();
		mockResolveSetupRecipe.mockReset();

		store = useCredentialSetupRecipeStore();
	});

	// -------------------------------------------------------------------------
	// 1. Gating — isExperimentEnabled
	// -------------------------------------------------------------------------

	describe('isExperimentEnabled', () => {
		it('returns false when PostHog returns no variant', () => {
			mockGetVariant.mockReturnValue(undefined);

			expect(store.isExperimentEnabled).toBe(false);
		});

		it('returns false when PostHog returns the control variant', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.control);

			expect(store.isExperimentEnabled).toBe(false);
		});

		it('returns false when PostHog returns an unrelated string', () => {
			mockGetVariant.mockReturnValue('some-other-variant');

			expect(store.isExperimentEnabled).toBe(false);
		});

		it('returns true when PostHog returns the expected variant', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);

			expect(store.isExperimentEnabled).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Activation — getRecipeActivation
	// -------------------------------------------------------------------------

	describe('getRecipeActivation', () => {
		it('returns activated=true when all gates pass (inExperiment + inV1Cohort + confidenceMet)', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE, { confidence: 'high' }));

			const activation = store.getRecipeActivation(V1_TYPE);

			expect(activation.activated).toBe(true);
			expect(activation.activationGates).toEqual({
				inExperiment: true,
				inV1Cohort: true,
				confidenceMet: true,
			});
		});

		it('returns activated=false when NOT in experiment', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.control);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE, { confidence: 'high' }));

			const activation = store.getRecipeActivation(V1_TYPE);

			expect(activation.activated).toBe(false);
			expect(activation.activationGates.inExperiment).toBe(false);
		});

		it('returns activated=false when NOT in V1 cohort', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(NON_V1_TYPE, { confidence: 'high' }));

			const activation = store.getRecipeActivation(NON_V1_TYPE);

			expect(activation.activated).toBe(false);
			expect(activation.activationGates.inV1Cohort).toBe(false);
		});

		it('returns activated=false when confidence is medium (not high)', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE, { confidence: 'medium' }));

			const activation = store.getRecipeActivation(V1_TYPE);

			expect(activation.activated).toBe(false);
			expect(activation.activationGates.confidenceMet).toBe(false);
		});

		it('returns activated=false when confidence is low', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE, { confidence: 'low' }));

			const activation = store.getRecipeActivation(V1_TYPE);

			expect(activation.activated).toBe(false);
			expect(activation.activationGates.confidenceMet).toBe(false);
		});

		it('returns the resolved recipe in the result', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			const resolved = makeResolved(V1_TYPE);
			mockResolveSetupRecipe.mockReturnValue(resolved);

			const activation = store.getRecipeActivation(V1_TYPE);

			expect(activation.resolved).toBe(resolved);
		});
	});

	// -------------------------------------------------------------------------
	// 3. Surface gating — isRecipeActive
	// -------------------------------------------------------------------------

	describe('isRecipeActive', () => {
		beforeEach(() => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE, { confidence: 'high' }));
		});

		it('returns true for "badges" surface when activation passes', () => {
			expect(store.isRecipeActive(V1_TYPE, 'badges')).toBe(true);
		});

		it('returns true for "modal" surface when activation passes', () => {
			expect(store.isRecipeActive(V1_TYPE, 'modal')).toBe(true);
		});

		it('returns false for "setupPanel" surface even when activation passes (Phase 1 disabled)', () => {
			expect(store.isRecipeActive(V1_TYPE, 'setupPanel')).toBe(false);
		});

		it('returns false for all surfaces when not activated', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.control);

			expect(store.isRecipeActive(V1_TYPE, 'badges')).toBe(false);
			expect(store.isRecipeActive(V1_TYPE, 'modal')).toBe(false);
			expect(store.isRecipeActive(V1_TYPE, 'setupPanel')).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Caching
	// -------------------------------------------------------------------------

	describe('caching', () => {
		it('calls resolveSetupRecipe only once for the same credential type', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE));

			store.getRecipeActivation(V1_TYPE);
			store.getRecipeActivation(V1_TYPE);
			store.getRecipeActivation(V1_TYPE);

			expect(mockResolveSetupRecipe).toHaveBeenCalledTimes(1);
		});

		it('calls resolveSetupRecipe separately for different credential types', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockImplementation((type: string) => makeResolved(type));

			store.getRecipeActivation(V1_TYPE);
			store.getRecipeActivation(NON_V1_TYPE);

			expect(mockResolveSetupRecipe).toHaveBeenCalledTimes(2);
		});

		it('re-resolves after clearCache()', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE));

			store.getRecipeActivation(V1_TYPE);
			expect(mockResolveSetupRecipe).toHaveBeenCalledTimes(1);

			store.clearCache();

			store.getRecipeActivation(V1_TYPE);
			expect(mockResolveSetupRecipe).toHaveBeenCalledTimes(2);
		});
	});

	// -------------------------------------------------------------------------
	// 5. Telemetry deduplication
	// -------------------------------------------------------------------------

	describe('telemetry deduplication on resolution', () => {
		it('fires credential_setup_recipe_resolved on first resolution', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE));

			store.getRecipeActivation(V1_TYPE);

			expect(mockTrack).toHaveBeenCalledWith(
				'credential_setup_recipe_resolved',
				expect.objectContaining({ credential_type: V1_TYPE }),
			);
		});

		it('does NOT fire again on second resolution (deduplication)', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE));

			store.getRecipeActivation(V1_TYPE);
			mockTrack.mockClear();

			store.getRecipeActivation(V1_TYPE);

			expect(mockTrack).not.toHaveBeenCalledWith(
				'credential_setup_recipe_resolved',
				expect.anything(),
			);
		});

		it('does NOT fire again after clearCache() (dedup set is session-scoped)', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE));

			store.getRecipeActivation(V1_TYPE);
			mockTrack.mockClear();

			store.clearCache();
			store.getRecipeActivation(V1_TYPE);

			expect(mockTrack).not.toHaveBeenCalledWith(
				'credential_setup_recipe_resolved',
				expect.anything(),
			);
		});

		it('fires separately for different credential types', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockImplementation((type: string) => makeResolved(type));

			store.getRecipeActivation(V1_TYPE);
			store.getRecipeActivation(NON_V1_TYPE);

			const calls = mockTrack.mock.calls.filter(
				([event]) => event === 'credential_setup_recipe_resolved',
			);
			expect(calls).toHaveLength(2);
		});

		it('includes standard telemetry properties on resolved event', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			const resolved = makeResolved(V1_TYPE, {
				confidence: 'high',
				resolutionSource: 'explicit_override',
			});
			mockResolveSetupRecipe.mockReturnValue(resolved);

			store.getRecipeActivation(V1_TYPE);

			expect(mockTrack).toHaveBeenCalledWith(
				'credential_setup_recipe_resolved',
				expect.objectContaining({
					experiment_name: CREDENTIAL_SETUP_RECIPE_EXPERIMENT.name,
					experiment_variant: CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant,
					credential_type: V1_TYPE,
					setup_mode: resolved.recipe.setupMode,
					friction: resolved.recipe.friction,
					confidence: resolved.confidence,
					resolution_source: resolved.resolutionSource,
					in_v1_cohort: true,
				}),
			);
		});
	});

	// -------------------------------------------------------------------------
	// 6. trackRecipeEvent
	// -------------------------------------------------------------------------

	describe('trackRecipeEvent', () => {
		it('fires the given event name with standard properties attached', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			const resolved = makeResolved(V1_TYPE, { confidence: 'high' });
			mockResolveSetupRecipe.mockReturnValue(resolved);

			store.trackRecipeEvent('user_clicked_connect', V1_TYPE);

			expect(mockTrack).toHaveBeenCalledWith(
				'user_clicked_connect',
				expect.objectContaining({
					experiment_name: CREDENTIAL_SETUP_RECIPE_EXPERIMENT.name,
					experiment_variant: CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant,
					credential_type: V1_TYPE,
					setup_mode: resolved.recipe.setupMode,
					friction: resolved.recipe.friction,
					confidence: resolved.confidence,
					resolution_source: resolved.resolutionSource,
					in_v1_cohort: true,
				}),
			);
		});

		it('merges extra properties into the telemetry payload', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE));

			store.trackRecipeEvent('user_clicked_connect', V1_TYPE, { surface: 'badges', extra: 42 });

			expect(mockTrack).toHaveBeenCalledWith(
				'user_clicked_connect',
				expect.objectContaining({ surface: 'badges', extra: 42 }),
			);
		});

		it('does not fire duplicate resolved event for the same type when trackRecipeEvent is called', () => {
			mockGetVariant.mockReturnValue(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant);
			mockResolveSetupRecipe.mockReturnValue(makeResolved(V1_TYPE));

			// First resolution via getRecipeActivation — fires resolved event
			store.getRecipeActivation(V1_TYPE);
			mockTrack.mockClear();

			// trackRecipeEvent should NOT re-fire resolved event
			store.trackRecipeEvent('some_event', V1_TYPE);

			expect(mockTrack).not.toHaveBeenCalledWith(
				'credential_setup_recipe_resolved',
				expect.anything(),
			);
			expect(mockTrack).toHaveBeenCalledWith('some_event', expect.any(Object));
		});
	});
});
