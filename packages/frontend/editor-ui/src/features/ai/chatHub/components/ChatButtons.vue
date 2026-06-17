<script setup lang="ts">
import { ref } from 'vue';
import { N8nButton } from '@n8n/design-system';
import type { ChatHubMessageButton } from '@n8n/api-types';

const { buttons, isDisabled } = defineProps<{
	buttons: ChatHubMessageButton[];
	isDisabled: boolean;
}>();

const clickedButtonIndex = ref<number | null>(null);
const isLoading = ref(false);

async function onClick(link: string, index: number) {
	if (isDisabled || clickedButtonIndex.value !== null || isLoading.value) {
		return;
	}

	isLoading.value = true;
	try {
		const response = await fetch(link);
		if (response.ok) {
			clickedButtonIndex.value = index;
		}
	} finally {
		isLoading.value = false;
	}
}
</script>

<template>
	<div :class="$style.buttons">
		<template v-for="(button, index) in buttons" :key="button.link">
			<N8nButton
				v-if="clickedButtonIndex === null || index === clickedButtonIndex"
				:type="button.type"
				:disabled="isDisabled || isLoading || clickedButtonIndex !== null"
				:loading="isLoading && clickedButtonIndex === null"
				size="small"
				@click="onClick(button.link, index)"
			>
				{{ button.text }}
			</N8nButton>
		</template>
	</div>
</template>

<style lang="scss" module>
.buttons {
	display: flex;
	gap: var(--spacing--xs);
}
</style>
