<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import { shouldTidyUp, type TidyUpOption } from '@/features/workflows/workflowDiff/useWorkflowTidyUp';
import type { IWorkflowDb } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';

const rootStore = useRootStore();
const i18n = useI18n();

const oldWorkflow = ref<IWorkflowDb | undefined>(undefined);
const newWorkflow = ref<IWorkflowDb | undefined>(undefined);

function emitPostMessageReady() {
	if (window.parent) {
		window.parent.postMessage(
			JSON.stringify({ command: 'n8nReady', version: rootStore.versionCli }),
			'*',
		);
	}
}

async function onPostMessageReceived(messageEvent: MessageEvent) {
	if (
		!messageEvent ||
		typeof messageEvent.data !== 'string' ||
		!messageEvent.data?.includes?.('"command"')
	) {
		return;
	}

	try {
		const json = JSON.parse(messageEvent.data);

		if (json && json.command === 'openDiff') {
			let oldWf = json.oldWorkflow as IWorkflowDb | undefined;
			let newWf = json.newWorkflow as IWorkflowDb | undefined;
			const tidyUpOption = json.tidyUp as TidyUpOption | undefined;

			// Apply tidy-up if needed
			// Note: For now, we just check if tidy-up is needed.
			// The actual layout will be applied by the canvas after rendering.
			// TODO: Implement actual tidy-up logic using Dagre layout
			if (oldWf && shouldTidyUp({ nodes: oldWf.nodes }, tidyUpOption)) {
				// Tidy-up will be applied by the canvas
				console.log('Tidy-up requested for old workflow');
			}
			if (newWf && shouldTidyUp({ nodes: newWf.nodes }, tidyUpOption)) {
				// Tidy-up will be applied by the canvas
				console.log('Tidy-up requested for new workflow');
			}

			oldWorkflow.value = oldWf;
			newWorkflow.value = newWf;
		}
	} catch (e) {
		// Ignore malformed messages
	}
}

onMounted(() => {
	window.addEventListener('message', onPostMessageReceived);
	emitPostMessageReady();
});

onUnmounted(() => {
	window.removeEventListener('message', onPostMessageReceived);
});
</script>

<template>
	<div :class="$style.demoDiffView">
		<WorkflowDiffView
			v-if="oldWorkflow || newWorkflow"
			:old-workflow="oldWorkflow"
			:new-workflow="newWorkflow"
			:old-label="i18n.baseText('workflowDiff.label.before')"
			:new-label="i18n.baseText('workflowDiff.label.after')"
		/>
		<div v-else :class="$style.waitingState">
			<p>{{ i18n.baseText('workflowDiff.waitingForData') }}</p>
		</div>
	</div>
</template>

<style module lang="scss">
.demoDiffView {
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
}

.waitingState {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-1);
}
</style>
