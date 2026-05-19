<script lang="ts" setup>
const props = defineProps<{
	data: string;
	mimeType: string;
}>();
</script>

<template>
	<embed
		:src="`data:${props.mimeType};base64,${props.data}`"
		:type="props.mimeType"
		:class="$style.file"
	/>
</template>

<style module>
.file {
	width: 100%;
	height: 480px;
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
}
</style>
