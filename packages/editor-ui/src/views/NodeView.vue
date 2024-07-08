<script lang="ts" setup>
import { useLocalStorage } from '@vueuse/core';
import { defineAsyncComponent, watch } from 'vue';
import { useRouter } from 'vue-router';

const NodeViewV1 = defineAsyncComponent(async () => await import('@/views/NodeView.v1.vue'));
const NodeViewV2 = defineAsyncComponent(async () => await import('@/views/NodeView.v2.vue'));

const router = useRouter();

const nodeViewVersion = useLocalStorage('NodeView.version', '1');

watch(nodeViewVersion, () => {
	router.go(0);
});
</script>

<template>
	<Suspense>
		<NodeViewV2 v-if="nodeViewVersion === '2'" />
		<NodeViewV1 v-else />
	</Suspense>
</template>
