<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { LARGE_STRING_THRESHOLD, MAX_DISPLAY_STRING_LENGTH } from '@/features/dataTable/constants';

const props = defineProps<{
	params: {
		value: string;
		onViewFull?: (value: string) => void;
	};
}>();

const i18n = useI18n();

const isLargeString = computed(() => {
	const value = props.params.value;
	return typeof value === 'string' && value.length > LARGE_STRING_THRESHOLD;
});

const displayValue = computed(() => {
	const value = props.params.value;
	if (!isLargeString.value) {
		return value;
	}
	return value.slice(0, MAX_DISPLAY_STRING_LENGTH);
});

const sizeInKB = computed(() => {
	const bytes = new Blob([props.params.value]).size;
	return (bytes / 1024).toFixed(1);
});

const handleViewFull = () => {
	if (props.params.onViewFull) {
		props.params.onViewFull(props.params.value);
	}
};
</script>

<template>
	<div :class="$style.container">
		<span :class="$style.text" :title="isLargeString ? displayValue : undefined">
			{{ displayValue }}
		</span>
		<span v-if="isLargeString" :class="$style.ellipsis">...</span>
		<N8nButton
			v-if="isLargeString"
			:class="$style.viewButton"
			type="tertiary"
			size="mini"
			:label="i18n.baseText('dataTable.viewFull', { interpolate: { size: sizeInKB } })"
			data-test-id="view-full-string-button"
			@click.stop="handleViewFull"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	height: 100%;
	overflow: hidden;
	// Ensure text doesn't break layout
	min-width: 0;
}

.text {
	// Escape HTML by rendering as text only
	white-space: pre-wrap;
	word-break: break-word;
	overflow-wrap: anywhere;
	overflow: hidden;
	// Limit to 3 lines
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	line-height: 1.2;
	// Max height = 3 lines * line-height * font-size
	max-height: calc(3 * 1.2 * var(--font-size--xs));
	flex: 1;
	min-width: 0;
}

.ellipsis {
	flex-shrink: 0;
	margin-left: calc(var(--spacing--4xs) * -1);
}

.viewButton {
	flex-shrink: 0;
	white-space: nowrap;
}
</style>
