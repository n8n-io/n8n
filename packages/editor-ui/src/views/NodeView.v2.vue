<script setup lang="ts">
import { computed, onMounted, useCssModule } from 'vue';
import { useRoute } from 'vue-router';
import { useWorkflowsStoreV2 } from '@/stores/workflows.store.v2';
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@/composables/useI18n';

const $style = useCssModule();

const route = useRoute();
const locale = useI18n();

const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const workflowsStoreV2 = useWorkflowsStoreV2();

const workflowId = computed<string>(() => route.params.workflowId as string);
const workflow = computed(() => workflowsStoreV2.workflowsById[workflowId.value]);
const workflowObject = computed(() => workflowsStoreV2.getWorkflowObject(workflowId.value));

const workflowRunning = computed(() => uiStore.isActionActive('workflowRunning'));
const runButtonText = computed(() => {
	if (!workflowRunning.value) {
		return locale.baseText('nodeView.runButtonText.executeWorkflow');
	}

	return locale.baseText('nodeView.runButtonText.executingWorkflow');
});

onMounted(() => {
	void initialize();
});

async function initialize() {
	await nodeTypesStore.getNodeTypes();
	await workflowsStoreV2.fetchWorkflow(workflowId.value);
}

async function onRunWorkflow() {
	await workflowsStoreV2.runWorkflow(workflowId.value, {});
}
</script>

<template>
	<WorkflowCanvas
		v-if="workflow && workflowObject"
		:workflow="workflow"
		:workflow-object="workflowObject"
	>
		<div :class="$style.executionButtons">
			<KeyboardShortcutTooltip :label="runButtonText" :shortcut="{ metaKey: true, keys: ['↵'] }">
				<N8nButton
					:loading="workflowRunning"
					:label="runButtonText"
					size="large"
					icon="flask"
					type="primary"
					data-test-id="execute-workflow-button"
					@click.stop="onRunWorkflow"
				/>
			</KeyboardShortcutTooltip>
		</div>
	</WorkflowCanvas>
</template>

<style lang="scss" module>
.executionButtons {
	position: absolute;
	display: flex;
	justify-content: center;
	align-items: center;
	left: 50%;
	transform: translateX(-50%);
	bottom: var(--spacing-l);
	width: auto;

	@media (max-width: $breakpoint-2xs) {
		bottom: 150px;
	}

	button {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-left: 0.625rem;

		&:first-child {
			margin: 0;
		}
	}
}
</style>
