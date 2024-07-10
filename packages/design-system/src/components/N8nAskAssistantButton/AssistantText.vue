<script setup lang="ts">
// todo render as component content
const props = withDefaults(defineProps<{ text: string; fontSize: string; lineHeight: string }>(), {
	text: '',
	fontSize: '12px',
	lineHeight: '16px',
});
</script>

<template>
	<span :class="$style.text" :style="{ fontSize, lineHeight }">{{ props.text }}</span>
</template>

<style lang="scss" module>
.text {
	background: linear-gradient(105deg, #5b60e8 0%, #aa7bec 50%, #ec7b8e 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	weight: 600;
}
</style>
