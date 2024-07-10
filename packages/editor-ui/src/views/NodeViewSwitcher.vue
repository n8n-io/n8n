<script lang="ts" setup>
import { useLocalStorage } from '@vueuse/core';
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import NodeViewV1 from '@/views/NodeView.vue';
import NodeViewV2 from '@/views/NodeView.v2.vue';

const router = useRouter();

const nodeViewVersion = useLocalStorage('NodeView.version', '1');

watch(nodeViewVersion, () => {
	router.go(0);
});
</script>

<template>
	<NodeViewV2 v-if="nodeViewVersion === '2'" />
	<NodeViewV1 v-else />
</template>
