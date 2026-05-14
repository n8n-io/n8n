# Setup experiment reference

Use this workflow when scaffolding a new experiment under `packages/frontend/editor-ui/src/experiments/`.

## Ask or infer

1. Experiment folder name, for example `setupPanelV2`.
2. Experiment constant name, for example `SETUP_PANEL_V2_EXPERIMENT`.
3. Variant shape:
   - simple `control/variant`, or
   - multi-variant.
4. Public API shape:
   - default to a Pinia store,
   - only use a composable when the experiment is genuinely tiny and stateless.
5. Whether persisted UI state is needed.
6. Whether optional `components/`, `data/`, `workflows/`, or host-surface wiring are in scope.

## Always do

1. Start in `packages/frontend/editor-ui/src/app/constants/experiments.ts`.
2. Add the experiment constant.
3. Add the experiment name to `EXPERIMENTS_TO_TRACK`.
4. Create `packages/frontend/editor-ui/src/experiments/<name>/`.
5. Pick one public API path:
   - Store-backed by default: add a `STORES.EXPERIMENT_*` entry in `packages/frontend/@n8n/stores/src/constants.ts`, then create `stores/<name>.store.ts` and `stores/<name>.store.test.ts`.
   - Tiny stateless composable only by exception: skip the `STORES.EXPERIMENT_*` entry and create a single composable such as `use<Name>Experiment.ts` with an adjacent test when needed.
6. If the experiment needs persisted UI state or a shared mutable API, use the store path, not the composable path.

## Enrollment standard

- Use `isEnabled` for PostHog enrollment only.
- For simple experiments, use `posthogStore.isVariantEnabled(EXPERIMENT.name, EXPERIMENT.variant)`.
- For multi-variant experiments, expose `currentVariant` and derive booleans from it.
- Keep display state separate with `shouldShow*`, `can*`, `hasDismissed*`, or `hasInteracted*`.

Do not mix enrollment with:

- `userIsTrialing`,
- cloud-only checks,
- selected-app checks,
- workflow-count checks,
- dismissal state.

If the user wants those conditions, treat them as local display logic, not enrollment logic.

## Persistence standard

Use `packages/frontend/editor-ui/src/app/composables/useStorage.ts` for experiment-owned persisted UI state.

Use it for:

- dismissed state,
- interaction state,
- last-seen state.

Do not use raw `localStorage` for new experiment-owned state unless the experiment must touch an existing non-experiment app key.

## Telemetry standard

- Keep `"User is part of experiment"` tracking centralized.
- Scaffold only experiment-specific `track*` helpers such as `trackViewed`, `trackClicked`, `trackDismissed`, or `trackCompleted`.

## Store scaffold

Default to this store shape and adapt names as needed:

```ts
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useStorage } from '@/app/composables/useStorage';
import { SETUP_PANEL_V2_EXPERIMENT } from '@/app/constants';
import { usePostHog } from '@/app/stores/posthog.store';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';

const DISMISSED_KEY = 'N8N_SETUP_PANEL_V2_DISMISSED';

export const useSetupPanelV2Store = defineStore(STORES.EXPERIMENT_SETUP_PANEL_V2, () => {
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
	const dismissed = useStorage(DISMISSED_KEY);

	const isEnabled = computed(() =>
		posthogStore.isVariantEnabled(
			SETUP_PANEL_V2_EXPERIMENT.name,
			SETUP_PANEL_V2_EXPERIMENT.variant,
		),
	);
	const isDismissed = computed(() => dismissed.value === 'true');
	const shouldShowCallout = computed(() => isEnabled.value && !isDismissed.value);

	function dismiss() {
		dismissed.value = 'true';
	}

	function trackViewed() {
		telemetry.track('Setup panel v2 viewed');
	}

	return {
		isEnabled,
		isDismissed,
		shouldShowCallout,
		dismiss,
		trackViewed,
	};
});
```

## Test scaffold

Default to one public API test next to the store. Use `stores/<name>.store.test.ts` as the standard location. Mirror the local style from:

- `packages/frontend/editor-ui/src/experiments/credentialsAppSelection/stores/credentialsAppSelection.store.test.ts`
- `packages/frontend/editor-ui/src/experiments/resourceCenter/stores/__tests__/resourceCenter.store.test.ts`

Use `__tests__/` only when the surrounding experiment already follows that layout or when the local package pattern makes colocating the test awkward.

The default assertions should cover:

1. enrollment logic,
2. persisted state when present,
3. experiment-specific telemetry helpers when present.

## Do not do by default

- Do not wire routes, layouts, sidebars, or modals automatically.
- Do not add empty `components/`, `data/`, or `workflows/` folders unless requested.
- Do not add product gating on top of PostHog enrollment unless the user explicitly wants local display logic.
- Do not scaffold participation tracking inside the experiment.

## Output reminder

At the end of the scaffold, explicitly tell the user what is still manual, for example:

- host-surface wiring,
- i18n keys,
- route guards,
- modal registration,
- extra workflow payload files.
