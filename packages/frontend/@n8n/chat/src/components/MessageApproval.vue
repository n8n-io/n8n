<script setup lang="ts">
import Button from './Button.vue';
import MarkdownRenderer from './MarkdownRenderer.vue';

defineProps<{
	text: string;
	approve: {
		text: string;
		link: string;
		type: 'primary' | 'secondary';
	};
	decline?: {
		text: string;
		link: string;
		type: 'primary' | 'secondary';
	};
}>();
</script>

<template>
	<div>
		<MarkdownRenderer :text="text" />
		<div :class="$style.buttons">
			<Button element="a" :href="approve.link" :type="approve.type" target="_blank">{{
				approve.text
			}}</Button>
			<Button
				v-if="decline"
				element="a"
				:href="decline.link"
				:type="decline.type"
				target="_blank"
				>{{ decline.text }}</Button
			>
		</div>
	</div>
</template>

<style lang="scss" module>
.buttons {
	display: flex;
	gap: var(--chat--spacing);
	margin-top: var(--chat--spacing);
}
</style>
