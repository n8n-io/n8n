<script setup lang="ts">
import Button from './Button.vue';
import MarkdownRenderer from './MarkdownRenderer.vue';

defineProps<{
	text: string;
	buttons: Array<{
		text: string;
		link: string;
		type: 'primary' | 'secondary';
	}>;
}>();
</script>

<template>
	<div>
		<MarkdownRenderer :text="text" />
		<div :class="$style.buttons">
			<template v-for="button in buttons" :key="button.text">
				<Button
					element="a"
					:href="button.link"
					:type="button.type"
					target="_blank"
					rel="noopener noreferrer"
					>{{ button.text }}</Button
				>
			</template>
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
