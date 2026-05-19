<script lang="ts" setup>
const props = defineProps<{
	data: string;
	mimeType: string;
}>();
</script>

<template>
	<img :src="`data:${props.mimeType};base64,${props.data}`" :class="$style.image" />
</template>

<style module>
.image {
	max-width: 100%;
	display: block;
}
</style>
