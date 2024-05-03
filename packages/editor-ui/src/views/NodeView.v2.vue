<script setup lang="ts">
import { computed, onMounted, useCssModule } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@/composables/useI18n';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';

const $style = useCssModule();

const router = useRouter();
const route = useRoute();
const locale = useI18n();

const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();

const { runWorkflow } = useRunWorkflow({ router });

const workflowId = computed<string>(() => route.params.workflowId as string);
const workflow = computed(() => workflowsStore.workflow);
const workflowObject = computed(() => workflowsStore.getCurrentWorkflow());

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
	await workflowsStore.fetchWorkflow(workflowId.value);
}

async function onRunWorkflow() {
	await runWorkflow({});
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
