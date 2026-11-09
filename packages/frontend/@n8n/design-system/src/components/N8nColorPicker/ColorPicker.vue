<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import { uid } from '../../utils';
import N8nButton from '../N8nButton';
import N8nInput from '../N8nInput';
import N8nPopover from '../N8nPopover';
import {
	clamp,
	DEFAULT_HSVA,
	formatColor,
	isColorFormat,
	parseColor,
	toCssColor,
	toOpaqueCss,
	type ColorFormat,
	type Hsva,
} from './color';

/**
 * Color selection control.
 * The panel commits a value when the user presses OK.
 * Closing the panel discards the draft.
 */
export type ColorPickerProps = {
	/** Disables the trigger, the text field, and the panel. */
	disabled?: boolean;
	/** Trigger size. `small` matches a compact parameter row. */
	size?: 'small' | 'large';
	/** Shows the opacity slider and writes an alpha channel. */
	showAlpha?: boolean;
	/**
	 * Output format.
	 * When omitted, a color without alpha is hex and a color with alpha is `rgba()`.
	 */
	colorFormat?: ColorFormat;
	/** Extra class on the popover panel. */
	popperClass?: string;
	/** Swatches shown in the panel. */
	predefine?: string[];
	/** Selected color. `null` means no color. */
	modelValue?: string | null;
	/** Shows a text field next to the trigger. */
	showInput?: boolean;
	/** Name of the text field. */
	name?: string;
};

defineOptions({ name: 'N8nColorPicker' });

const props = withDefaults(defineProps<ColorPickerProps>(), {
	disabled: false,
	size: 'large',
	showAlpha: false,
	popperClass: '',
	predefine: undefined,
	modelValue: undefined,
	showInput: true,
	name: undefined,
});

const emit = defineEmits<{
	/** Committed color. `null` clears the field. */
	'update:modelValue': [value: string | null];
	/** Committed color. Fires with `update:modelValue`. */
	change: [value: string | null];
	/** Draft color while the user moves a slider or edits the panel field. */
	'active-change': [value: string | null];
	focus: [event: FocusEvent];
	blur: [event: FocusEvent];
}>();

const { t } = useI18n();
const generatedName = uid('color-picker');
const isOpen = ref(false);
const draft = ref<Hsva>({ ...DEFAULT_HSVA });
const panelInput = ref('');
const textValue = ref(props.modelValue ?? '');
const dragging = ref<'sv' | 'hue' | 'alpha' | null>(null);

const inputName = computed(() => props.name ?? generatedName);
const activeFormat = computed(() =>
	isColorFormat(props.colorFormat) ? props.colorFormat : undefined,
);
const shownColor = computed(() => {
	const source = isOpen.value ? draft.value : parseColor(props.modelValue);
	return source ? toCssColor(source) : null;
});
const hueBackground = computed(() => `hsl(${Math.round(draft.value.h)}, 100%, 50%)`);
const opaqueColor = computed(() => toOpaqueCss(draft.value));
const triggerLabel = computed(() => {
	const current = props.modelValue?.trim() ? props.modelValue : t('colorPicker.empty');
	return t('colorPicker.description', { color: current });
});

watch(
	() => props.modelValue,
	(value) => {
		textValue.value = value ?? '';
	},
);

function formatted(color: Hsva): string {
	return formatColor(color, activeFormat.value, props.showAlpha);
}

function setDraft(next: Hsva, notify: boolean) {
	draft.value = {
		h: clamp(next.h, 0, 360),
		s: clamp(next.s, 0, 100),
		v: clamp(next.v, 0, 100),
		a: clamp(next.a, 0, 100),
	};
	panelInput.value = formatted(draft.value);
	if (notify) emit('active-change', panelInput.value);
}

function onOpenChange(open: boolean) {
	if (props.disabled) return;
	if (open) setDraft(parseColor(props.modelValue) ?? { ...DEFAULT_HSVA }, false);
	isOpen.value = open;
}

function commit(value: string | null) {
	emit('update:modelValue', value);
	emit('change', value);
}

function confirmColor() {
	applyPanelInput();
	commit(formatted(draft.value));
	isOpen.value = false;
}

function clearColor() {
	commit(null);
	isOpen.value = false;
}

function applyPanelInput() {
	const parsed = parseColor(panelInput.value);
	if (!parsed) {
		panelInput.value = formatted(draft.value);
		return;
	}
	setDraft(parsed, true);
}

function onTextInput(value: string) {
	textValue.value = value;
	if (value.trim() === '') {
		if (props.modelValue) commit(null);
		return;
	}
	const parsed = parseColor(value);
	if (!parsed) return;
	const next = formatted(parsed);
	if (next === props.modelValue) return;
	commit(next);
}

function selectPredefine(value: string) {
	const parsed = parseColor(value);
	if (!parsed) return;
	setDraft(parsed, true);
}

function isPredefineActive(value: string): boolean {
	const parsed = parseColor(value);
	if (!parsed) return false;
	return (
		Math.round(parsed.h) === Math.round(draft.value.h) &&
		Math.round(parsed.s) === Math.round(draft.value.s) &&
		Math.round(parsed.v) === Math.round(draft.value.v) &&
		Math.round(parsed.a) === Math.round(draft.value.a)
	);
}

function ratio(event: PointerEvent, axis: 'x' | 'y'): number | null {
	const element = event.currentTarget;
	if (!(element instanceof HTMLElement)) return null;
	const rect = element.getBoundingClientRect();
	const size = axis === 'x' ? rect.width : rect.height;
	if (size === 0) return null;
	const delta = axis === 'x' ? event.clientX - rect.left : event.clientY - rect.top;
	return clamp(delta / size, 0, 1);
}

function onSvPointerDown(event: PointerEvent) {
	dragging.value = 'sv';
	if (event.currentTarget instanceof HTMLElement) {
		event.currentTarget.setPointerCapture(event.pointerId);
	}
	moveSv(event);
}

function onSvPointerMove(event: PointerEvent) {
	if (dragging.value !== 'sv') return;
	moveSv(event);
}

function moveSv(event: PointerEvent) {
	const x = ratio(event, 'x');
	const y = ratio(event, 'y');
	if (x === null || y === null) return;
	setDraft({ ...draft.value, s: Math.round(x * 100), v: Math.round((1 - y) * 100) }, true);
}

function onHuePointerDown(event: PointerEvent) {
	dragging.value = 'hue';
	if (event.currentTarget instanceof HTMLElement) {
		event.currentTarget.setPointerCapture(event.pointerId);
	}
	moveHue(event);
}

function onHuePointerMove(event: PointerEvent) {
	if (dragging.value !== 'hue') return;
	moveHue(event);
}

function moveHue(event: PointerEvent) {
	const y = ratio(event, 'y');
	if (y === null) return;
	setDraft({ ...draft.value, h: Math.round(y * 360) }, true);
}

function onAlphaPointerDown(event: PointerEvent) {
	dragging.value = 'alpha';
	if (event.currentTarget instanceof HTMLElement) {
		event.currentTarget.setPointerCapture(event.pointerId);
	}
	moveAlpha(event);
}

function onAlphaPointerMove(event: PointerEvent) {
	if (dragging.value !== 'alpha') return;
	moveAlpha(event);
}

function moveAlpha(event: PointerEvent) {
	const x = ratio(event, 'x');
	if (x === null) return;
	setDraft({ ...draft.value, a: Math.round(x * 100) }, true);
}

function stopDrag() {
	dragging.value = null;
}

function onSvKeydown(event: KeyboardEvent) {
	let { s, v } = draft.value;
	if (event.key === 'ArrowRight') s += 1;
	else if (event.key === 'ArrowLeft') s -= 1;
	else if (event.key === 'ArrowUp') v += 1;
	else if (event.key === 'ArrowDown') v -= 1;
	else return;
	event.preventDefault();
	setDraft({ ...draft.value, s, v }, true);
}

function onHueKeydown(event: KeyboardEvent) {
	const current = draft.value.h;
	const next =
		event.key === 'ArrowUp' || event.key === 'ArrowLeft'
			? current - 1
			: event.key === 'ArrowDown' || event.key === 'ArrowRight'
				? current + 1
				: event.key === 'Home'
					? 0
					: event.key === 'End'
						? 360
						: null;
	if (next === null) return;
	event.preventDefault();
	setDraft({ ...draft.value, h: next }, true);
}

function onAlphaKeydown(event: KeyboardEvent) {
	const current = draft.value.a;
	const next =
		event.key === 'ArrowRight' || event.key === 'ArrowUp'
			? current + 1
			: event.key === 'ArrowLeft' || event.key === 'ArrowDown'
				? current - 1
				: event.key === 'Home'
					? 0
					: event.key === 'End'
						? 100
						: null;
	if (next === null) return;
	event.preventDefault();
	setDraft({ ...draft.value, a: next }, true);
}
</script>

<template>
	<span :class="[$style.component, 'n8n-color-picker']">
		<N8nPopover
			:open="isOpen"
			:content-class="popperClass || undefined"
			:enable-scrolling="false"
			side="bottom"
			align="start"
			@update:open="onOpenChange"
		>
			<template #trigger>
				<button
					:class="[$style.trigger, $style[size]]"
					type="button"
					:disabled="disabled"
					:aria-label="t('colorPicker.select')"
					:aria-description="triggerLabel"
					data-test-id="color-picker-trigger"
					@focus="emit('focus', $event)"
					@blur="emit('blur', $event)"
				>
					<span :class="$style.checker">
						<span v-if="shownColor" :class="$style.fill" :style="{ backgroundColor: shownColor }" />
						<span v-else :class="$style.empty" />
					</span>
				</button>
			</template>
			<template #content>
				<div :class="$style.panel" data-test-id="color-picker-panel">
					<div :class="$style.canvas">
						<div
							:class="$style.sv"
							:style="{ backgroundColor: hueBackground }"
							role="slider"
							tabindex="0"
							:aria-label="t('colorPicker.saturation')"
							:aria-valuetext="`${Math.round(draft.s)}% saturation, ${Math.round(draft.v)}% brightness`"
							aria-valuemin="0"
							aria-valuemax="100"
							:aria-valuenow="Math.round(draft.s)"
							data-test-id="color-picker-sv"
							@pointerdown="onSvPointerDown"
							@pointermove="onSvPointerMove"
							@pointerup="stopDrag"
							@keydown="onSvKeydown"
						>
							<span :class="$style.svWhite" />
							<span :class="$style.svBlack" />
							<span
								:class="$style.thumb"
								:style="{
									left: `${draft.s}%`,
									top: `${100 - draft.v}%`,
								}"
							/>
						</div>
						<div
							:class="$style.hue"
							role="slider"
							tabindex="0"
							aria-orientation="vertical"
							:aria-label="t('colorPicker.hue')"
							aria-valuemin="0"
							aria-valuemax="360"
							:aria-valuenow="Math.round(draft.h)"
							data-test-id="color-picker-hue"
							@pointerdown="onHuePointerDown"
							@pointermove="onHuePointerMove"
							@pointerup="stopDrag"
							@keydown="onHueKeydown"
						>
							<span :class="$style.thumb" :style="{ top: `${(draft.h / 360) * 100}%` }" />
						</div>
					</div>
					<div
						v-if="showAlpha"
						:class="$style.alpha"
						role="slider"
						tabindex="0"
						:aria-label="t('colorPicker.opacity')"
						aria-valuemin="0"
						aria-valuemax="100"
						:aria-valuenow="Math.round(draft.a)"
						data-test-id="color-picker-alpha"
						@pointerdown="onAlphaPointerDown"
						@pointermove="onAlphaPointerMove"
						@pointerup="stopDrag"
						@keydown="onAlphaKeydown"
					>
						<span :class="$style.checker" />
						<span
							:class="$style.alphaFill"
							:style="{
								backgroundImage: `linear-gradient(to right, transparent, ${opaqueColor})`,
							}"
						/>
						<span :class="$style.thumb" :style="{ left: `${draft.a}%` }" />
					</div>
					<div
						v-if="predefine?.length"
						:class="$style.predefine"
						role="listbox"
						:aria-label="t('colorPicker.swatches')"
					>
						<button
							v-for="(color, index) in predefine"
							:key="`${color}-${index}`"
							:class="[$style.swatch, { [$style.swatchActive]: isPredefineActive(color) }]"
							type="button"
							role="option"
							:aria-selected="isPredefineActive(color)"
							:aria-label="color"
							:data-test-id="`color-picker-swatch-${index}`"
							@click="selectPredefine(color)"
						>
							<span :class="$style.checker" />
							<span :class="$style.fill" :style="{ backgroundColor: color }" />
						</button>
					</div>
					<div :class="$style.footer">
						<N8nInput
							:class="$style.value"
							size="small"
							:model-value="panelInput"
							:aria-label="t('colorPicker.value')"
							data-test-id="color-picker-value"
							@update:model-value="panelInput = $event"
							@blur="applyPanelInput"
							@keydown.enter.prevent="applyPanelInput"
						/>
						<N8nButton
							size="small"
							variant="ghost"
							data-test-id="color-picker-clear"
							@click="clearColor"
						>
							{{ t('colorPicker.clear') }}
						</N8nButton>
						<N8nButton size="small" data-test-id="color-picker-confirm" @click="confirmColor">
							{{ t('colorPicker.confirm') }}
						</N8nButton>
					</div>
				</div>
			</template>
		</N8nPopover>
		<N8nInput
			v-if="showInput"
			:class="$style.input"
			:disabled="disabled"
			:size="size"
			:model-value="textValue"
			:name="inputName"
			:aria-label="t('colorPicker.value')"
			type="text"
			data-test-id="color-picker-input"
			@update:model-value="onTextInput"
		/>
	</span>
</template>

<style lang="scss" module>
.component {
	display: inline-flex;
	align-items: center;
}

.trigger {
	position: relative;
	display: inline-flex;
	flex-shrink: 0;
	padding: var(--spacing--5xs);
	border: var(--border);
	border-radius: var(--radius--3xs);
	background: var(--background--surface);
	cursor: pointer;

	&:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
	}
}

.small {
	width: var(--height--xs);
	height: var(--height--xs);
}

.large {
	width: var(--height--xl);
	height: var(--height--xl);
}

.checker,
.fill,
.empty {
	position: absolute;
	inset: 0;
}

.checker {
	overflow: hidden;
	border-radius: var(--radius--4xs);
	background-color: var(--color--neutral-white);
	background-image:
		linear-gradient(45deg, var(--color--neutral-200) 25%, transparent 25%),
		linear-gradient(-45deg, var(--color--neutral-200) 25%, transparent 25%),
		linear-gradient(45deg, transparent 75%, var(--color--neutral-200) 75%),
		linear-gradient(-45deg, transparent 75%, var(--color--neutral-200) 75%);
	background-size: var(--spacing--2xs) var(--spacing--2xs);
	background-position:
		0 0,
		0 var(--spacing--4xs),
		var(--spacing--4xs) calc(-1 * var(--spacing--4xs)),
		calc(-1 * var(--spacing--4xs)) 0;
}

.fill {
	border-radius: inherit;
}

.empty {
	background: linear-gradient(
		to top right,
		transparent calc(50% - var(--border-width)),
		var(--color--danger) calc(50% - var(--border-width)),
		var(--color--danger) calc(50% + var(--border-width)),
		transparent calc(50% + var(--border-width))
	);
}

.input {
	margin-left: var(--spacing--3xs);
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: var(--spacing--5xl);
	padding: var(--spacing--2xs);
}

.canvas {
	display: flex;
	gap: var(--spacing--2xs);
	height: calc(var(--spacing--4xl) + var(--spacing--2xl));
}

.sv,
.hue,
.alpha {
	position: relative;
	touch-action: none;
	cursor: crosshair;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
	}
}

.sv {
	flex: 1;
	border-radius: var(--radius--4xs);
	overflow: hidden;
}

.svWhite,
.svBlack {
	position: absolute;
	inset: 0;
}

// White and black are the saturation and brightness axes. Theme tokens are not pure black.
.svWhite {
	background: linear-gradient(to right, #fff, transparent);
}

.svBlack {
	background: linear-gradient(to top, #000, transparent);
}

.hue {
	width: var(--spacing--sm);
	border-radius: var(--radius--full);
	// The hue spectrum is the color model. Theme tokens do not describe it.
	background: linear-gradient(
		to bottom,
		hsl(0, 100%, 50%),
		hsl(60, 100%, 50%),
		hsl(120, 100%, 50%),
		hsl(180, 100%, 50%),
		hsl(240, 100%, 50%),
		hsl(300, 100%, 50%),
		hsl(360, 100%, 50%)
	);
}

.alpha {
	height: var(--spacing--sm);
	border-radius: var(--radius--full);
	overflow: hidden;
}

.alphaFill {
	position: absolute;
	inset: 0;
}

.thumb {
	position: absolute;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	border: var(--border-width) solid var(--color--neutral-white);
	border-radius: var(--radius--full);
	box-shadow: 0 0 0 var(--border-width) var(--color--neutral-900);
	transform: translate(-50%, -50%);
	pointer-events: none;
}

.hue .thumb {
	left: 50%;
}

.alpha .thumb {
	top: 50%;
}

.predefine {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.swatch {
	position: relative;
	width: var(--spacing--md);
	height: var(--spacing--md);
	padding: 0;
	border: var(--border);
	border-radius: var(--radius--3xs);
	background: none;
	cursor: pointer;
}

.swatchActive {
	border-color: var(--color--primary);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.value {
	flex: 1;
	min-width: 0;
}
</style>
