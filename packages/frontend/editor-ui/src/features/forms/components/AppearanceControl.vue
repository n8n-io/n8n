<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nColorPicker, N8nInput, N8nInputNumber } from '@n8n/design-system';
import type { CssVarControl } from '../constants/cssVariableMap';

const props = defineProps<{
	control: CssVarControl;
	modelValue: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const i18n = useI18n();

// For `px` controls the stored value is like "20px". Strip/restore the unit.
const numericValue = computed({
	get() {
		return parseFloat(props.modelValue) || 0;
	},
	set(n: number) {
		emit('update:modelValue', `${n}px`);
	},
});

// For `opacity` controls the stored value is a decimal like "0.5". Display as 0–100%.
const opacityValue = computed({
	get() {
		return Math.round((parseFloat(props.modelValue) || 0) * 100);
	},
	set(n: number) {
		emit('update:modelValue', String(n / 100));
	},
});
</script>

<template>
	<div :class="$style.row">
		<span :class="$style.label">{{ i18n.baseText(control.labelKey) }}</span>
		<div :class="$style.control">
			<N8nColorPicker
				v-if="control.type === 'color'"
				:model-value="modelValue"
				size="small"
				color-format="hex"
				popper-class="appearance-color-picker-panel"
				@active-change="(v) => v && emit('update:modelValue', v)"
				@change="(v) => v && emit('update:modelValue', v)"
			/>
			<div v-else-if="control.type === 'px'" :class="$style.pxControl">
				<N8nInputNumber
					v-model="numericValue"
					:min="0"
					:max="2000"
					size="small"
					controls-position="right"
				/>
				<span :class="$style.unit">px</span>
			</div>
			<div v-else-if="control.type === 'opacity'" :class="$style.pxControl">
				<N8nInputNumber
					v-model="opacityValue"
					:min="0"
					:max="100"
					:step="5"
					:precision="0"
					size="small"
					controls-position="right"
				/>
				<span :class="$style.unit">%</span>
			</div>
			<N8nInput
				v-else-if="control.type === 'text'"
				:model-value="modelValue"
				size="small"
				:class="$style.fullWidth"
				@update:model-value="(v) => emit('update:modelValue', v)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--5xs) 0;
}

.label {
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.control {
	flex-shrink: 0;
	width: 130px;
	display: flex;
	align-items: center;

	:global(.n8n-color-picker) {
		width: 100%;
	}

	:global(.n8n-color-picker .n8n-input) {
		flex: 1;
		min-width: 0;
	}
}

.fullWidth {
	width: 100%;
}

.pxControl {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;

	:global(.n8n-input-number) {
		flex: 1;
		min-width: 0;
	}
}

.unit {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
}
</style>

<!-- Popup is teleported to <body>, so scoped styles don't reach it. -->
<style>
.appearance-color-picker-panel .el-color-dropdown__btns {
	display: none;
}
</style>
