<script setup lang="ts">
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, onMounted, ref } from 'vue';

const node = ref<INodeUi | null>();
const workflowsStore = useWorkflowsStore();
const workflow = computed(() => workflowsStore.getCurrentWorkflow());

onMounted(() => {
	window.addEventListener('message', async (message) => {
		if (!('type' in message.data)) {
			return;
		}

		console.log('<<<<<', message.data);

		if (message.data.type === 'setNode') {
			node.value = workflowsStore.getNodeByName(message.data.node);
		}
	});

	window.opener.postMessage({ type: 'ready' }, window.location.origin);
});
</script>
<template>
	<div :class="$style.container">
		<RunDataAi v-if="node && workflow" :node="node" :workflow="workflow" />
		<div v-else>Please select node</div>
	</div>
</template>
<style lang="scss" module>
.container {
	flex-grow: 1;
	width: 100%;
}
</style>
