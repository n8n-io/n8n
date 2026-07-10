<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

const props = defineProps<{
	label: string;
	icon: IconName | undefined;
	disabled: boolean;
	loading: boolean;
	tooltipItems: string[];
}>();

const emit = defineEmits<{
	click: [];
}>();

const hasTooltip = computed(() => props.tooltipItems.length > 0);

const onClick = async () => {
	emit('click');
};
</script>

<template>
	<N8nTooltip :disabled="!hasTooltip" placement="top">
		<template #content>
			<p v-for="(item, index) in tooltipItems" :key="index" :class="$style.tooltipItem">
				{{ item }}
			</p>
		</template>
		<N8nButton
			data-test-id="trigger-execute-button"
			:label="label"
			:disabled="disabled"
			:loading="loading"
			:icon="icon"
			size="small"
			@click="onClick"
		/>
	</N8nTooltip>
</template>

<style module lang="scss">
.tooltipItem {
	margin: 0;
	padding: 0;

	& + & {
		margin-top: var(--spacing--5xs);
	}
}
</style>
