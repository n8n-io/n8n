<script lang="ts" setup>
import { useLocalStorage } from '@vueuse/core';
import { computed, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import NodeViewV1 from '@/views/NodeView.vue';
import NodeViewV2 from '@/views/NodeView.v2.vue';
import { getNodeViewTab } from '@/utils/canvasUtils';
import {
	MAIN_HEADER_TABS,
	MODAL_CANCEL,
	MODAL_CONFIRM,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	VIEWS,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useMessage } from '@/composables/useMessage';
import { useI18n } from '@/composables/useI18n';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useSourceControlStore } from '@/stores/sourceControl.store';

const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const npsSurveyStore = useNpsSurveyStore();
const sourceControlStore = useSourceControlStore();

const router = useRouter();
const route = useRoute();
const message = useMessage();
const i18n = useI18n();
const workflowHelpers = useWorkflowHelpers({ router });

const { resetWorkspace } = useCanvasOperations({ router });

const nodeViewVersion = useLocalStorage('NodeView.version', '1');

const workflowId = computed<string>(() => route.params.name as string);

const isReadOnlyEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
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
		(toNodeViewTab === MAIN_HEADER_TABS.WORKFLOW && from.name === VIEWS.EXECUTION_DEBUG)
	) {
		next();
		return;
	}

	if (uiStore.stateIsDirty && !isReadOnlyEnvironment.value) {
		const confirmModal = await message.confirm(
			i18n.baseText('generic.unsavedWork.confirmMessage.message'),
			{
				title: i18n.baseText('generic.unsavedWork.confirmMessage.headline'),
				type: 'warning',
				confirmButtonText: i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
				cancelButtonText: i18n.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
				showClose: true,
			},
		);

		if (confirmModal === MODAL_CONFIRM) {
			// Make sure workflow id is empty when leaving the editor
			workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
			const saved = await workflowHelpers.saveCurrentWorkflow({}, false);
			if (saved) {
				await npsSurveyStore.fetchPromptsData();
			}
			uiStore.stateIsDirty = false;

			if (from.name === VIEWS.NEW_WORKFLOW) {
				// Replace the current route with the new workflow route
				// before navigating to the new route when saving new workflow.
				await router.replace({
					name: VIEWS.WORKFLOW,
					params: { name: workflowId.value },
				});

				await router.push(to);
			} else {
				next();
			}
		} else if (confirmModal === MODAL_CANCEL) {
			workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
			resetWorkspace();
			uiStore.stateIsDirty = false;
			next();
		}
	} else {
		next();
	}
});
</script>

<template>
	<NodeViewV2 v-if="nodeViewVersion === '2'" />
	<NodeViewV1 v-else />
</template>
