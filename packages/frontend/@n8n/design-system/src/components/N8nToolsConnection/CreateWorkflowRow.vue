<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

defineProps<{
	loading: boolean;
}>();

const emit = defineEmits<{
	create: [];
}>();

const i18n = useI18n();
</script>

<template>
	<button
		type="button"
		:class="[$style.row, { [$style.selectedToolRow]: dataActive }]"
		:disabled="loading"
		:aria-busy="loading"
		data-test-id="tools-connection-create-workflow"
		@click="emit('create')"
	>
		<span :class="$style.icon" aria-hidden="true">
			<N8nIcon icon="plus" :size="20" />
		</span>
		<N8nText :class="$style.title" bold>
			{{ i18n.baseText('generic.create.workflow') }}
		</N8nText>
	</button>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	height: 64px;
	padding: var(--spacing--2xs) var(--spacing--xs);
	width: 100%;
	border: 0;
	border-radius: var(--radius);
	background: none;
	color: inherit;
	text-align: left;
	cursor: pointer;
	flex-shrink: 0;

	&:focus-visible {
		@include focus.focus-ring-inset;
	}

	&:disabled {
		cursor: default;
	}
}

.icon {
	flex-shrink: 0;
	width: var(--height--xl);
	height: var(--height--xl);
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color--primary);
	border-radius: var(--radius--full);
}

.title {
	flex: 1 1 0;
	min-width: 0;
	font-weight: var(--font-weight--medium);
}

.row.selectedToolRow {
	background: var(--background--hover);
}
</style>
