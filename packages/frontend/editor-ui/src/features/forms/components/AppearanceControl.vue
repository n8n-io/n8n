<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nInput } from '@n8n/design-system';
import type { CssVarControl } from '../constants/cssVariableMap';

const props = defineProps<{
	control: CssVarControl;
	modelValue: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const i18n = useI18n();

// ── Color ─────────────────────────────────────────────────────────────────────

function onSwatchInput(e: Event) {
	emit('update:modelValue', (e.target as HTMLInputElement).value);
}

// Sync the local hex text as the user types; only emit on valid full hex values.
const hexText = ref(props.modelValue);
watch(
	() => props.modelValue,
	(v) => {
		hexText.value = v;
	},
);
function onHexInput(value: string) {
	hexText.value = value;
	const normalized = value.startsWith('#') ? value : `#${value}`;
	if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
		emit('update:modelValue', normalized);
	}
}

// ── Numeric (px) ──────────────────────────────────────────────────────────────

const numericText = ref(String(parseFloat(props.modelValue) || 0));
watch(
	() => props.modelValue,
	(v) => {
		numericText.value = String(parseFloat(v) || 0);
	},
);
function onNumericInput(value: string) {
	numericText.value = value;
	const n = parseFloat(value);
	if (!isNaN(n) && n >= 0) emit('update:modelValue', `${n}px`);
}

// ── Opacity ───────────────────────────────────────────────────────────────────

const opacityText = ref(String(Math.round((parseFloat(props.modelValue) || 0) * 100)));
watch(
	() => props.modelValue,
	(v) => {
		opacityText.value = String(Math.round((parseFloat(v) || 0) * 100));
	},
);
function onOpacityInput(value: string) {
	opacityText.value = value;
	const n = parseFloat(value);
	if (!isNaN(n)) emit('update:modelValue', String(Math.min(100, Math.max(0, n)) / 100));
}
</script>

<template>
	<div :class="$style.row">
		<span :class="$style.label">{{ i18n.baseText(control.labelKey) }}</span>

		<div :class="$style.control">
			<!-- Color: small native swatch + hex text input -->
			<template v-if="control.type === 'color'">
				<label :class="$style.swatch" :title="modelValue">
					<span :class="$style.swatchColor" :style="{ background: modelValue }" />
					<input
						type="color"
						:value="modelValue"
						:class="$style.hiddenColor"
						@input="onSwatchInput"
					/>
				</label>
				<N8nInput
					:model-value="hexText"
					size="mini"
					:class="$style.hexInput"
					@update:model-value="onHexInput"
				/>
			</template>

			<!-- Px: number input with inline unit suffix -->
			<N8nInput
				v-else-if="control.type === 'px'"
				:model-value="numericText"
				size="mini"
				type="number"
				:class="$style.numericInput"
				@update:model-value="onNumericInput"
			>
				<template #suffix><span :class="$style.unit">px</span></template>
			</N8nInput>

			<!-- Opacity: 0–100 with % suffix -->
			<N8nInput
				v-else-if="control.type === 'opacity'"
				:model-value="opacityText"
				size="mini"
				type="number"
				:class="$style.numericInput"
				@update:model-value="onOpacityInput"
			>
				<template #suffix><span :class="$style.unit">%</span></template>
			</N8nInput>

			<!-- Text: full-width input -->
			<N8nInput
				v-else-if="control.type === 'text'"
				:model-value="modelValue"
				size="mini"
				:class="$style.textInput"
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
	min-height: 26px;
	padding: 2px 0;
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
	width: 160px;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

/* ── Color swatch ──────────────────────────────────────────────────────── */

.swatch {
	flex-shrink: 0;
	width: 22px;
	height: 22px;
	border-radius: var(--radius--sm);
	border: 1px solid var(--color--foreground);
	overflow: hidden;
	cursor: pointer;
	position: relative;
	display: block;
}

.swatchColor {
	display: block;
	width: 100%;
	height: 100%;
}

.hiddenColor {
	position: absolute;
	inset: 0;
	opacity: 0;
	width: 100%;
	height: 100%;
	padding: 0;
	border: none;
	cursor: pointer;
}

.hexInput {
	flex: 1;
	min-width: 0;
}

/* ── Numeric / text inputs ─────────────────────────────────────────────── */

.numericInput {
	width: 100%;

	/* Hide browser native number spinners — steppers are too heavy */
	:global(input[type='number']) {
		appearance: textfield;
	}
	:global(input[type='number']::-webkit-outer-spin-button),
	:global(input[type='number']::-webkit-inner-spin-button) {
		display: none;
	}
}

.textInput {
	width: 100%;
}

.unit {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	user-select: none;
}
</style>
