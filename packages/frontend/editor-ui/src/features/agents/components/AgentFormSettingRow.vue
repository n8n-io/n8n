<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

defineProps<{
	controlId?: string;
	layout?: 'horizontal' | 'vertical';
	actionMaxWidth?: string;
	title: string;
	description?: string;
}>();
</script>

<template>
	<div :class="[$style.row, { [$style.vertical]: layout === 'vertical' }]" :data-layout="layout">
		<div :class="$style.info">
			<!-- Rows without a control ID rely on the control's own accessible name. -->
			<component :is="controlId ? 'label' : 'span'" :for="controlId">
				<N8nText size="medium" color="text-dark" bold :class="$style.label">{{ title }}</N8nText>
			</component>
			<N8nText v-if="description" size="small" :class="$style.description">
				{{ description }}
			</N8nText>
		</div>
		<div
			:class="$style.action"
			:style="{ maxWidth: layout === 'vertical' ? undefined : actionMaxWidth }"
		>
			<slot />
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.row.vertical {
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--4xs);

	.action {
		width: 100%;
	}
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.label {
	font-size: var(--font-size--sm);
}

.description {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
}

.action {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}
</style>
