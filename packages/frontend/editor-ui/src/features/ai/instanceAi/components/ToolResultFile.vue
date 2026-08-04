<script lang="ts" setup>
defineProps<{
	data: string;
	mimeType: string;
}>();
</script>

<template>
	<embed :src="`data:${mimeType};base64,${data}`" :type="mimeType" :class="$style.file" />
</template>

<style module>
.file {
	width: 100%;
	height: 480px;
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
}
</style>
