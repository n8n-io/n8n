<script lang="ts" setup>
import { computed, onMounted, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import NodeViewV1 from '@/views/NodeView.vue';
import NodeViewV2 from '@/views/NodeView.v2.vue';
import { getNodeViewTab } from '@/utils/canvasUtils';
import { MAIN_HEADER_TABS, PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useNodeViewVersionSwitcher } from '@/composables/useNodeViewVersionSwitcher';

const workflowsStore = useWorkflowsStore();
const sourceControlStore = useSourceControlStore();

const router = useRouter();
const route = useRoute();
const workflowHelpers = useWorkflowHelpers({ router });

const { nodeViewVersion, migrateToNewNodeViewVersion } = useNodeViewVersionSwitcher();

const workflowId = computed<string>(() => route.params.name as string);

const isReadOnlyEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});

onMounted(() => {
	migrateToNewNodeViewVersion();
});

watch(nodeViewVersion, () => {
	router.go(0);
});

/**
 * Routing
 */

onBeforeRouteLeave(async (to, from, next) => {
	const toNodeViewTab = getNodeViewTab(to);

	if (
		toNodeViewTab === MAIN_HEADER_TABS.EXECUTIONS ||
		from.name === VIEWS.TEMPLATE_IMPORT ||
		(toNodeViewTab === MAIN_HEADER_TABS.WORKFLOW && from.name === VIEWS.EXECUTION_DEBUG) ||
		isReadOnlyEnvironment.value
	) {
		next();
		return;
	}

	await workflowHelpers.promptSaveUnsavedWorkflowChanges(next, {
		async confirm() {
			if (from.name === VIEWS.NEW_WORKFLOW) {
				// Replace the current route with the new workflow route
				// before navigating to the new route when saving new workflow.
				await router.replace({
					name: VIEWS.WORKFLOW,
					params: { name: workflowId.value },
				});

				await router.push(to);

				return false;
			}

			// Make sure workflow id is empty when leaving the editor
			workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);

			return true;
		},
	});
});
</script>

<template>
	<NodeViewV2 v-if="nodeViewVersion === '2'" />
	<NodeViewV1 v-else />
</template>
