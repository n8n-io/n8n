<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon } from '@n8n/design-system';

defineProps<{
	editedNodesCount: number;
	loading: boolean;
}>();

const emit = defineEmits<{
	click: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div
		:class="$style.banner"
		role="button"
		tabindex="0"
		data-test-id="review-changes-banner"
		@click="emit('click')"
		@keydown.enter="emit('click')"
	>
		<span :class="$style.label">
			{{
				i18n.baseText('aiAssistant.builder.reviewChanges.editedNodes', {
					interpolate: { count: String(editedNodesCount) },
				})
			}}
		</span>
		<N8nButton
			variant="ghost"
			size="small"
			:loading="loading"
			:class="$style.button"
			@click.stop="emit('click')"
		>
			{{ i18n.baseText('aiAssistant.builder.reviewChanges.button') }}
			<N8nIcon icon="arrow-up-right" size="small" />
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-bottom: none;
	border-radius: var(--radius) var(--radius) 0 0;
	padding: var(--spacing--3xs) var(--spacing--3xs) var(--spacing--3xs) var(--spacing--xs);
	margin: 0 var(--spacing--2xs);
	cursor: pointer;
}

.label {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.button {
	pointer-events: none;
}
</style>
