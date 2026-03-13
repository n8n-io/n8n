<script lang="ts" setup>
defineProps<{
	data: string;
	mimeType: string;
}>();
</script>

<template>
	<img :src="`data:${mimeType};base64,${data}`" :class="$style.image" />
</template>

<style module>
.image {
	max-width: 100%;
	display: block;
}
</style>
