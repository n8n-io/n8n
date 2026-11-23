<script setup lang="ts">
defineProps<{
	params: { label: string };
}>();
</script>

<template>
	<span class="n8n-data-grid-special-value" data-test-id="data-grid-special-value">{{
		params.label
	}}</span>
</template>
