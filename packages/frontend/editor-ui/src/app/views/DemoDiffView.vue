<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import type { IWorkflowDb } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';

const rootStore = useRootStore();
const i18n = useI18n();

const sourceWorkflow = ref<IWorkflowDb | undefined>(undefined);
const targetWorkflow = ref<IWorkflowDb | undefined>(undefined);
const tidyUpEnabled = ref(false);

/**
 * Validates that an object has the minimum required workflow structure.
 * Allows undefined (for partial diffs) but rejects malformed objects.
 */
function isValidWorkflow(obj: unknown): obj is IWorkflowDb | undefined {
	if (obj === undefined || obj === null) {
		return true;
	}
	return typeof obj === 'object' && 'nodes' in obj && 'connections' in obj;
}

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
			// Validate workflow structures before accepting the message
			if (!isValidWorkflow(json.oldWorkflow) || !isValidWorkflow(json.newWorkflow)) {
				return;
			}

			sourceWorkflow.value = json.oldWorkflow ?? undefined;
			targetWorkflow.value = json.newWorkflow ?? undefined;
			tidyUpEnabled.value = json.tidyUp === true;
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
			v-if="sourceWorkflow || targetWorkflow"
			:source-workflow="sourceWorkflow"
			:target-workflow="targetWorkflow"
			:source-label="i18n.baseText('workflowDiff.label.before')"
			:target-label="i18n.baseText('workflowDiff.label.after')"
			:tidy-up="tidyUpEnabled"
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
