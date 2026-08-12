<script setup lang="ts">
defineOptions({ name: 'UiSpinningCat' });

// Matching the descriptor's default, so a node without the prop and a node
// created with it render the same size.
withDefaults(defineProps<{ size?: string | number }>(), { size: 40 });
</script>

<template>
	<img
		class="ui-spinning-cat"
		src="https://slackmojis.com/emojis/13273-meow_blobcat/download"
		alt="Spinning cat"
		:style="{ width: `${size}px`, height: `${size}px` }"
	/>
</template>

<style scoped>
.ui-spinning-cat {
	display: inline-block;
	animation: ui-spinning-cat-spin 1s linear infinite;
}

@keyframes ui-spinning-cat-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
