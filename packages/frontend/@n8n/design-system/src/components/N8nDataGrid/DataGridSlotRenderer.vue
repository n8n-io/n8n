<script setup lang="ts">
import type { VNode } from 'vue';

const props = defineProps<{
	params: { render: () => VNode[] | undefined; testId?: string };
}>();

const Content = () => props.params.render();
</script>

<template>
	<div class="n8n-data-grid-slot" :data-test-id="params.testId">
		<Content />
	</div>
</template>
