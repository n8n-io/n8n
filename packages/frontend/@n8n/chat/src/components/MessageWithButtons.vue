<script setup lang="ts">
import { computed, ref } from 'vue';

import { useOptions } from '@n8n/chat/composables';

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

const chatOptions = useOptions();
const clickedButtonIndex = ref<number | null>(null);

const parseHttpOrigin = (value: string): string | null => {
	try {
		const parsed = new URL(value);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return null;
		}
		return parsed.origin;
	} catch {
		return null;
	}
};

const validOrigins = computed(() => {
	const origins = new Set<string>();
	const webhookOrigin = parseHttpOrigin(chatOptions.options.webhookUrl);
	if (webhookOrigin) {
		origins.add(webhookOrigin);
	}

	for (const entry of chatOptions.options.allowedButtonOrigins ?? []) {
		const origin = parseHttpOrigin(entry);
		if (origin) {
			origins.add(origin);
		}
	}

	return origins;
});

const isButtonVisible = (link: string, index: number): boolean => {
	try {
		const url = new URL(link, window.location.href);
		if (!validOrigins.value.has(url.origin)) {
			return false;
		}
		return clickedButtonIndex.value === null || index === clickedButtonIndex.value;
	} catch {
		return false;
	}
};

const onClick = async (link: string, index: number) => {
	if (clickedButtonIndex.value !== null) {
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
					v-if="isButtonVisible(button.link, index)"
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
