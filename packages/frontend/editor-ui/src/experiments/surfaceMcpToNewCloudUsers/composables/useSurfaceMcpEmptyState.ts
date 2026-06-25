import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { computed, ref, watch, type Ref } from 'vue';
import { useSurfaceMcpToNewCloudUsersStore } from '../stores/surfaceMcpToNewCloudUsers.store';
import { useSurfaceMcpToNewCloudUsersEligibility } from './useSurfaceMcpToNewCloudUsersEligibility';

type SurfaceMcpEmptyStateSuppression =
	| 'app_selection'
	| 'builder_prompt'
	| 'recommended_templates'
	| 'no_create_permission';

type BooleanRef = Readonly<Ref<boolean>>;

type UseSurfaceMcpEmptyStateOptions = {
	canCreateWorkflow: BooleanRef;
	showAppSelection: BooleanRef;
	showBuilderPrompt: BooleanRef;
	showRecommendedTemplatesInline: BooleanRef;
};

export function useSurfaceMcpEmptyState({
	canCreateWorkflow,
	showAppSelection,
	showBuilderPrompt,
	showRecommendedTemplatesInline,
}: UseSurfaceMcpEmptyStateOptions) {
	const mcpStore = useMCPStore();
	const surfaceMcpStore = useSurfaceMcpToNewCloudUsersStore();
	const { isEligible } = useSurfaceMcpToNewCloudUsersEligibility();
	const hasTrackedEntryPointViewed = ref(false);
	const hasTrackedOpportunityViewed = ref(false);

	const showOpportunity = computed(() => isEligible.value && surfaceMcpStore.isEnabled);

	const suppressedBy = computed<SurfaceMcpEmptyStateSuppression | null>(() => {
		if (!showOpportunity.value) {
			return null;
		}

		if (!canCreateWorkflow.value) {
			return 'no_create_permission';
		}

		if (showAppSelection.value) {
			return 'app_selection';
		}

		if (showBuilderPrompt.value) {
			return 'builder_prompt';
		}

		if (showRecommendedTemplatesInline.value) {
			return 'recommended_templates';
		}

		return null;
	});

	const showTile = computed(
		() => showOpportunity.value && surfaceMcpStore.isTileVariant && suppressedBy.value === null,
	);

	const showReminder = computed(
		() =>
			isEligible.value &&
			surfaceMcpStore.isFirstOpenModalVariant &&
			surfaceMcpStore.hasDismissedFirstOpenModal,
	);

	watch(
		showOpportunity,
		(value) => {
			if (value && !hasTrackedOpportunityViewed.value) {
				hasTrackedOpportunityViewed.value = true;
				surfaceMcpStore.trackOpportunityViewed(
					'tile',
					'empty_state_tile',
					showTile.value,
					suppressedBy.value,
					mcpStore.mcpAccessEnabled,
				);
			}
		},
		{ immediate: true },
	);

	watch(
		showTile,
		(value, previousValue) => {
			if (value && !previousValue && !hasTrackedEntryPointViewed.value) {
				hasTrackedEntryPointViewed.value = true;
				surfaceMcpStore.trackEntryPointViewed(
					'tile',
					'empty_state_tile',
					mcpStore.mcpAccessEnabled,
				);
			}
		},
		{ immediate: true },
	);

	return {
		showOpportunity,
		suppressedBy,
		showTile,
		showReminder,
	};
}
