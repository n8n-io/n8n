<script lang="ts" setup>
defineProps<{
	data: string;
	mediaType: string;
}>();
</script>

<template>
	<img :src="`data:${mediaType};base64,${data}`" :class="$style.image" />
</template>

<style module>
.image {
	max-width: 100%;
	display: block;
}
</style>
