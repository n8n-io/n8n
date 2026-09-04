import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';

import { GROUP_NODE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Whether a canvas group is a real node that holds its members through their
 * `parentId`, instead of a render-only `nodeGroups` entry.
 *
 * Both gates must be on: the instance must allow it (`N8N_GROUP_NODE_ENABLED`,
 * which reaches the editor as a setting) and the user must be in the rollout.
 * The instance guard lets a self-hosted instance keep the older path whatever
 * the rollout says.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */
export function useGroupNodeExperiment() {
	const posthogStore = usePostHog();
	const settingsStore = useSettingsStore();

	const isFeatureEnabled = computed(
		() =>
			settingsStore.isGroupNodeFeatureEnabled &&
			posthogStore.isFeatureEnabled(GROUP_NODE_EXPERIMENT.name),
	);

	return { isFeatureEnabled };
}
