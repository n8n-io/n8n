<script setup lang="ts">
defineProps<{
	placement: 'left' | 'right';
}>();
</script>

<template>
	<n8n-info-tip type="tooltip" theme="info-light" :tooltip-placement="placement">
		<n8n-text :bold="true" size="small">
			<slot />
		</n8n-text>
	</n8n-info-tip>
</template>

<style module lang="scss"></style>
