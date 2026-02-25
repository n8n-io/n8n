<script setup lang="ts">
import { ref } from 'vue';

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

const clickedButtonIndex = ref<number | null>(null);

const isSameDomain = (link: string): boolean => {
	try {
		const url = new URL(link, window.location.href);
		return url.origin === window.location.origin;
	} catch {
		return false;
	}
};

const onClick = async (link: string, index: number) => {
	if (clickedButtonIndex.value !== null) {
		return;
	}

	if (!isSameDomain(link)) {
		return;
	}

	const response = await fetch(link);
	if (response.ok) {
		clickedButtonIndex.value = index;
	}
};
</script>

<template>
	<div>
		<MarkdownRenderer :text="text" />
		<div :class="$style.buttons">
			<template v-for="(button, index) in buttons" :key="button.text">
				<Button
					v-if="clickedButtonIndex === null || index === clickedButtonIndex"
					element="button"
					:type="button.type"
					:disabled="index === clickedButtonIndex"
					@click="onClick(button.link, index)"
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
