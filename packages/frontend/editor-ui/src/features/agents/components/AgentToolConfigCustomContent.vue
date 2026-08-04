<script setup lang="ts">
import AgentCustomToolViewer from './AgentCustomToolViewer.vue';

defineProps<{
	code: string;
}>();
</script>

<template>
	<AgentCustomToolViewer :code="code" />
</template>
