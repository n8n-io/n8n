<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton, N8nCheckbox, N8nPopover } from '@n8n/design-system';
import { i18n as locale } from '@n8n/i18n';
import type { ExecutionColumnDefinition, ExecutionColumnId } from '../../executions.types';

const props = defineProps<{
	columns: ExecutionColumnDefinition[];
	isColumnVisible: (id: ExecutionColumnId) => boolean;
	getColumnLabel: (col: ExecutionColumnDefinition) => string;
}>();

const emit = defineEmits<{
	'toggle-column': [id: ExecutionColumnId];
}>();

const standardColumns = computed(() => props.columns.filter((col) => col.group === 'standard'));

const annotationColumns = computed(() => props.columns.filter((col) => col.group === 'annotation'));

const customDataColumns = computed(() => props.columns.filter((col) => col.group === 'customData'));

function onToggle(id: ExecutionColumnId) {
	emit('toggle-column', id);
}
</script>

<template>
	<N8nPopover
		side="bottom"
		align="end"
		position-strategy="absolute"
		width="240px"
		:content-class="$style['popover-content']"
		show-arrow
	>
		<template #trigger>
			<N8nButton
				icon="columns-3-cog"
				type="tertiary"
				size="medium"
				square
				data-test-id="execution-column-picker-button"
			/>
		</template>
		<template #content>
			<div data-test-id="execution-column-picker">
				<div :class="$style.groupTitle">
					{{ locale.baseText('executionsList.columns.title') }}
				</div>

				<div :class="$style.group">
					<N8nCheckbox
						v-for="col in standardColumns"
						:key="col.id"
						:model-value="isColumnVisible(col.id)"
						:label="getColumnLabel(col)"
						:class="$style.checkboxItem"
						:data-test-id="`execution-column-toggle-${col.id}`"
						@update:model-value="onToggle(col.id)"
					/>
				</div>

				<div :class="$style.group">
					<div :class="$style.groupLabel">
						{{ locale.baseText('executionsList.columns.annotations') }}
					</div>
					<N8nCheckbox
						v-for="col in annotationColumns"
						:key="col.id"
						:model-value="isColumnVisible(col.id)"
						:label="getColumnLabel(col)"
						:class="$style.checkboxItem"
						:data-test-id="`execution-column-toggle-${col.id}`"
						@update:model-value="onToggle(col.id)"
					/>
				</div>

				<div v-if="customDataColumns.length > 0" :class="$style.group">
					<div :class="$style.groupLabel">
						{{ locale.baseText('executionsList.columns.highlightedData') }}
					</div>
					<N8nCheckbox
						v-for="col in customDataColumns"
						:key="col.id"
						:model-value="isColumnVisible(col.id)"
						:label="getColumnLabel(col)"
						:class="$style.checkboxItem"
						:data-test-id="`execution-column-toggle-${col.id}`"
						@update:model-value="onToggle(col.id)"
					/>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.popover-content {
	padding: var(--spacing--xs) var(--spacing--sm);
}

.groupTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	margin-bottom: var(--spacing--xs);
}

.group {
	& + & {
		margin-top: var(--spacing--xs);
		padding-top: var(--spacing--xs);
		border-top: var(--border);
	}
}

.groupLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin-bottom: var(--spacing--4xs);
}

.checkboxItem {
	display: flex;
	padding: var(--spacing--4xs) 0;
}
</style>
