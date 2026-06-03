import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useLocalStorage } from '@vueuse/core';

/**
 * PROTOTYPE ONLY — branch `prototype/improve-publish-state`.
 *
 * Lets reviewers force the workflow publish control into any of the 8 redesigned
 * states (including the two "live broken" states the backend cannot currently
 * detect) so the new status/action split can be evaluated without backend work.
 *
 * Active only when the URL contains `?prototype=publish`. To remove the prototype,
 * delete this file, `PublishStatePrototypeSwitcher.vue`, and the `isPrototypeMode`
 * branch in `WorkflowHeaderDraftPublishActions.vue`.
 */
export type PublishUiState =
	| 'not-published-eligible'
	| 'not-published-not-eligible'
	| 'published-no-changes'
	| 'published-with-valid-changes'
	| 'published-with-invalid-changes'
	| 'published-live-broken'
	| 'published-live-broken-with-valid-changes'
	| 'published-live-broken-with-invalid-changes';

export const PUBLISH_STATE_PROTOTYPE_STATES: Array<{ value: PublishUiState; label: string }> = [
	{ value: 'not-published-eligible', label: '1 · Not published (eligible)' },
	{ value: 'not-published-not-eligible', label: '2 · Not published (not eligible)' },
	{ value: 'published-no-changes', label: '3 · Published (no changes)' },
	{ value: 'published-with-valid-changes', label: '4 · Published (valid changes)' },
	{ value: 'published-with-invalid-changes', label: '5 · Published (invalid changes)' },
	{ value: 'published-live-broken', label: '6 · Published / broken (no changes)' },
	{
		value: 'published-live-broken-with-valid-changes',
		label: '7 · Published / broken (valid changes)',
	},
	{
		value: 'published-live-broken-with-invalid-changes',
		label: '8 · Published / broken (invalid changes)',
	},
];

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function usePublishStatePrototype() {
	const route = useRoute();

	const isPrototypeMode = computed(() => route.query.prototype === 'publish');

	// Persisted so reviewers keep the same state across reloads / hot reloads.
	const mockState = useLocalStorage<PublishUiState | null>('prototype.publishState.state', null);

	// Stand-in data so "published" states render fully on any workflow, even one
	// that has never actually been published.
	const mockDisplayData = computed(() => ({
		versionName: 'v3',
		publishDate: new Date(Date.now() - TWO_HOURS_MS).toISOString(),
		// Literal placeholder — the real reason text is TBD, so we don't fabricate one.
		statusReason: '{reason}',
		actionReason: '{reason}',
	}));

	return {
		isPrototypeMode,
		mockState,
		mockDisplayData,
		states: PUBLISH_STATE_PROTOTYPE_STATES,
	};
}
