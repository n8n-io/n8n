<script lang="ts" setup>
import { RovingFocusGroup, RovingFocusItem } from 'reka-ui';

import { useI18n } from '../../composables/useI18n';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon';

export type N8nDateRangePickerPreset = {
	value: string | number;
	label: string;
	active?: boolean;
	disabled?: boolean;
	icon?: IconName;
};

defineOptions({ name: 'N8nDateRangePickerPresets' });

defineProps<{
	presets: N8nDateRangePickerPreset[];
}>();

const emit = defineEmits<{
	select: [value: string | number];
}>();

const { t } = useI18n();

function onSelect(preset: N8nDateRangePickerPreset) {
	if (preset.disabled) return;
	emit('select', preset.value);
}
</script>

<template>
	<RovingFocusGroup
		:class="$style.Presets"
		role="group"
		:aria-label="t('dateRangePicker.presets')"
		orientation="vertical"
		loop
	>
		<RovingFocusItem
			v-for="preset in presets"
			:key="preset.value"
			as="button"
			type="button"
			:tab-stop-id="String(preset.value)"
			:active="preset.active"
			:focusable="!preset.disabled"
			:disabled="preset.disabled"
			:class="[$style.PresetButton, preset.active && $style.Active]"
			:aria-pressed="preset.active ? 'true' : 'false'"
			@click="onSelect(preset)"
		>
			<span :class="$style.Label">{{ preset.label }}</span>
			<N8nIcon v-if="preset.icon" :icon="preset.icon" size="small" :class="$style.Icon" />
		</RovingFocusItem>
	</RovingFocusGroup>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.Presets {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	width: 100%;
}

.PresetButton {
	display: flex;
	align-items: center;
	width: 100%;
	min-height: var(--height--sm);
	padding: 0 var(--spacing--2xs);
	border: none;
	border-radius: var(--radius--3xs);
	background: transparent;
	color: var(--text-color);
	font: inherit;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--sm);
	text-align: left;
	cursor: pointer;
	user-select: none;

	@include focus.focus-visible-ring;
}

.PresetButton:hover {
	background-color: var(--background--hover);
}

.PresetButton:active,
.Active,
.Active:hover {
	background-color: var(--background--active);
}

.PresetButton:disabled,
.PresetButton[data-disabled] {
	cursor: not-allowed;
	opacity: 0.5;
}

.PresetButton:disabled:hover,
.PresetButton[data-disabled]:hover {
	background-color: transparent;
}

.Label {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.Icon {
	flex-shrink: 0;
	margin-left: var(--spacing--2xs);
	color: var(--text-color--subtler);
}
</style>
