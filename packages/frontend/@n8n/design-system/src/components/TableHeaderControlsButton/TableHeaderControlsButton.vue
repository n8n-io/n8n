<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '@n8n/design-system/composables/useI18n';

import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nPopoverReka from '../N8nPopoverReka/N8nPopoverReka.vue';

interface ColumnHeader {
	key: string;
	label: string;
	visible: boolean;
}

interface Props {
	columns: ColumnHeader[];
}

const props = defineProps<Props>();

const visibleColumns = computed(() => props.columns.filter((column) => column.visible));
const hiddenColumns = computed(() => props.columns.filter((column) => !column.visible));

const { t } = useI18n();

const emit = defineEmits<{
	'update:columnVisibility': [key: string, visibility: boolean];
}>();
</script>

<template>
	<N8nPopoverReka>
		<template #trigger>
			<N8nButton icon="sliders-horizontal" type="secondary">
				{{ t('tableControlsButton.display') }}
			</N8nButton>
		</template>
		<template #content>
			<div
				:class="$style.shownSection"
				:style="{ display: 'flex', flexDirection: 'column', gap: 2 }"
			>
				<h4 :class="$style.header">
					{{ t('tableControlsButton.shown') }}
				</h4>
				<fieldset v-for="column in visibleColumns" :key="column.key" :class="$style.column">
					<N8nIcon icon="grip-vertical" :class="$style.grip" />
					<label>{{ column.label }}</label>
					<N8nIcon
						:class="$style.visibilityToggle"
						icon="eye"
						@click="() => emit('update:columnVisibility', column.key, false)"
					/>
				</fieldset>
			</div>
			<div
				v-if="hiddenColumns.length"
				:style="{ display: 'flex', flexDirection: 'column', gap: 2 }"
			>
				<p :class="$style.header">
					{{ t('tableControlsButton.hidden') }}
				</p>
				<fieldset
					v-for="column in hiddenColumns"
					:key="column.key"
					:class="[$style.column, $style.hidden]"
				>
					<N8nIcon icon="grip-vertical" :class="[$style.grip, $style.hidden]" />
					<label>{{ column.label }}</label>
					<N8nIcon
						:class="$style.visibilityToggle"
						icon="eye-off"
						@click="() => emit('update:columnVisibility', column.key, true)"
					/>
				</fieldset>
			</div>
		</template>
	</N8nPopoverReka>
</template>

<style lang="scss" module>
.header {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	margin-bottom: var(--spacing-xs);
}

.shownSection {
	margin-bottom: var(--spacing-l);
}

.grip {
	color: var(--color-text-light);
}

.column {
	display: flex;
	gap: 12px;
	color: var(--color-text-dark);
	padding: 6px 0;
	align-items: center;

	label {
		font-size: var(--font-size-xs);
		flex-grow: 1;
	}
}

.hidden {
	color: var(--color-text-lighter);

	label {
		color: var(--color-text-light);
	}
}

.visibilityToggle {
	cursor: pointer;
}
</style>
