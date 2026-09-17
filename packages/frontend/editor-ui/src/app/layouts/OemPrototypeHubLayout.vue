<script setup lang="ts">
import BaseLayout from '@/app/layouts/BaseLayout.vue';

const emit = defineEmits<{
	mounted: [Element];
}>();
</script>

<template>
	<BaseLayout @mounted="emit('mounted', $event)">
		<RouterView />
	</BaseLayout>
</template>
