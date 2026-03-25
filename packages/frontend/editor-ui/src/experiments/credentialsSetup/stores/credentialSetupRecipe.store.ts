import { useTelemetry } from '@/app/composables/useTelemetry';
import { CREDENTIAL_SETUP_RECIPE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import type { GenericValue } from 'n8n-workflow';
import { SURFACE_FLAGS } from '../constants';
import { V1_COHORT } from '../data/v1Cohort';
import { useRecipeResolver } from '../composables/useRecipeResolver';
import type {
	RecipeActivation,
	RecipeSurface,
	ResolvedSetupRecipe,
} from '../credentialsSetup.types';

export const useCredentialSetupRecipeStore = defineStore(
	STORES.EXPERIMENT_CREDENTIAL_SETUP_RECIPE,
	() => {
		const posthogStore = usePostHog();
		const telemetry = useTelemetry();
		const { resolveSetupRecipe } = useRecipeResolver();

		// -----------------------------------------------------------------------
		// State
		// -----------------------------------------------------------------------

		const recipeCache = reactive(new Map<string, RecipeActivation>());
		const telemetryFired = reactive(new Set<string>());
		const surfaceFlags = reactive({ ...SURFACE_FLAGS });

		// -----------------------------------------------------------------------
		// Computed
		// -----------------------------------------------------------------------

		const isExperimentEnabled = computed(
			() =>
				posthogStore.getVariant(CREDENTIAL_SETUP_RECIPE_EXPERIMENT.name) ===
				CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant,
		);

		// -----------------------------------------------------------------------
		// Helpers
		// -----------------------------------------------------------------------

		function buildStandardProperties(
			credentialTypeName: string,
			resolved: ResolvedSetupRecipe,
			inV1Cohort: boolean,
		): Record<string, GenericValue> {
			return {
				experiment_name: CREDENTIAL_SETUP_RECIPE_EXPERIMENT.name,
				experiment_variant: CREDENTIAL_SETUP_RECIPE_EXPERIMENT.variant,
				credential_type: credentialTypeName,
				setup_mode: resolved.recipe.setupMode,
				friction: resolved.recipe.friction,
				confidence: resolved.confidence,
				resolution_source: resolved.resolutionSource,
				in_v1_cohort: inV1Cohort,
			};
		}

		// -----------------------------------------------------------------------
		// Methods
		// -----------------------------------------------------------------------

		function getRecipeActivation(credentialTypeName: string): RecipeActivation {
			const cached = recipeCache.get(credentialTypeName);
			if (cached !== undefined) {
				return cached;
			}

			const resolved = resolveSetupRecipe(credentialTypeName);

			const inExperiment = isExperimentEnabled.value;
			const inV1Cohort = V1_COHORT.has(credentialTypeName);
			const confidenceMet = resolved.confidence === 'high';

			const activation: RecipeActivation = {
				resolved,
				activated: inExperiment && inV1Cohort && confidenceMet,
				activationGates: {
					inExperiment,
					inV1Cohort,
					confidenceMet,
				},
			};

			recipeCache.set(credentialTypeName, activation);

			// Fire telemetry once per session per credential type
			if (!telemetryFired.has(credentialTypeName)) {
				telemetryFired.add(credentialTypeName);
				telemetry.track(
					'credential_setup_recipe_resolved',
					buildStandardProperties(credentialTypeName, resolved, inV1Cohort),
				);
			}

			return activation;
		}

		function isRecipeActive(credentialTypeName: string, surface: RecipeSurface): boolean {
			const activation = getRecipeActivation(credentialTypeName);
			return activation.activated && surfaceFlags[surface];
		}

		function clearCache(): void {
			recipeCache.clear();
			// telemetryFired is intentionally NOT cleared — session-scoped dedup
		}

		function trackRecipeEvent(
			eventName: string,
			credentialTypeName: string,
			extraProperties: Record<string, GenericValue> = {},
		): void {
			const activation = getRecipeActivation(credentialTypeName);
			const inV1Cohort = V1_COHORT.has(credentialTypeName);
			const standardProps = buildStandardProperties(
				credentialTypeName,
				activation.resolved,
				inV1Cohort,
			);

			telemetry.track(eventName, { ...standardProps, ...extraProperties });
		}

		// -----------------------------------------------------------------------
		// Return
		// -----------------------------------------------------------------------

		return {
			surfaceFlags,
			isExperimentEnabled,
			getRecipeActivation,
			isRecipeActive,
			clearCache,
			trackRecipeEvent,
		};
	},
);
