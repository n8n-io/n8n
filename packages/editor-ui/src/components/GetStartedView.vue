<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router/composables';

import MainPanel from './Node/NodeCreator/MainPanel.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { VIEWS } from '@/constants';

const router = useRouter();
const progress = ref(10);
const loading = ref(true);

onMounted(async () => {
	await useNodeTypesStore().getNodeTypes();
	loading.value = false;
});

function openWorkflow(nodes: string[]) {
	if (nodes.length > 0) {
		router.push({ name: VIEWS.NEW_WORKFLOW, query: { start: nodes.join(',') } });
	}
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.progressBar">
			<div :style="{ width: `${progress}%` }"></div>
		</div>

		<div :class="$style.nodes" v-if="!loading">
			<main-panel @nodeTypeSelected="openWorkflow" />
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.progressBar {
	width: 100%;
	height: 12px;
	background-color: #eeecf9;

	> div {
		background-color: #5c4ec2;
		height: 12px;
	}
}

.nodes {
	width: 480px;
	margin-top: 44px;

	> div {
		margin-bottom: 8px;
	}
}
</style>
