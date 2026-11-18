<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon } from '@n8n/design-system';

import AvatarColorField from './AvatarColorField.vue';
import {
	AVATAR_COLOR_PRESETS,
	AVATAR_PRESET_LABEL_KEYS,
	swatchFor,
	type AvatarGeneratorInput,
} from './avatarGenerator';

/**
 * The controls under the generated orb: a color to drag around, a few quick
 * picks, and a shuffle. The dialog derives the palette and shows the result
 * in the orb above; this panel only edits the inputs.
 */

const props = defineProps<{
	modelValue: AvatarGeneratorInput;
	busy: boolean;
}>();

/**
 * `discrete` marks a one-off change (a preset), which the orb can ease into;
 * dragging the colour field streams values and wants the orb to keep up instead.
 */
export type GeneratorInputOptions = { discrete: boolean };

const emit = defineEmits<{
	'update:modelValue': [value: AvatarGeneratorInput, options: GeneratorInputOptions];
	shuffle: [];
}>();

const i18n = useI18n();

const swatch = computed(() => swatchFor(props.modelValue.hue, props.modelValue.tone));

const valueText = computed(() =>
	i18n.baseText('auth.avatar.generate.color.valueText', {
		interpolate: {
			hue: String(Math.round(props.modelValue.hue)),
			tone: String(Math.round(props.modelValue.tone)),
		},
	}),
);

const presets = computed(() =>
	AVATAR_COLOR_PRESETS.map((preset) => ({
		...preset,
		label: i18n.baseText(AVATAR_PRESET_LABEL_KEYS[preset.id]),
		swatch: swatchFor(preset.hue, preset.tone),
		active: preset.hue === props.modelValue.hue && preset.tone === props.modelValue.tone,
	})),
);

const onColor = (value: { hue: number; tone: number }, options: GeneratorInputOptions) => {
	emit('update:modelValue', { ...props.modelValue, ...value }, options);
};

// Each shuffle remounts the icon, so its one-turn spin restarts even mid-spin.
const shuffles = ref(0);

const onShuffle = () => {
	shuffles.value += 1;
	emit('shuffle');
};
</script>

<template>
	<div :class="$style.root" data-test-id="avatar-generator-panel">
		<AvatarColorField
			:hue="modelValue.hue"
			:tone="modelValue.tone"
			:swatch="swatch"
			:label="i18n.baseText('auth.avatar.generate.color.ariaLabel')"
			:value-text="valueText"
			:disabled="busy"
			@change="onColor($event, { discrete: false })"
		/>

		<div :class="$style.bottomRow">
			<div
				:class="$style.presets"
				role="group"
				:aria-label="i18n.baseText('auth.avatar.generate.presets')"
				data-test-id="avatar-color-presets"
			>
				<button
					v-for="preset in presets"
					:key="preset.id"
					type="button"
					:class="[$style.preset, { [$style.presetActive]: preset.active }]"
					:style="{ backgroundColor: preset.swatch }"
					:aria-label="preset.label"
					:aria-pressed="preset.active"
					:title="preset.label"
					:disabled="busy"
					:data-test-id="`avatar-color-preset-${preset.id}`"
					@click="onColor({ hue: preset.hue, tone: preset.tone }, { discrete: true })"
				></button>
			</div>
			<N8nButton
				variant="outline"
				size="small"
				:disabled="busy"
				data-test-id="avatar-shuffle"
				@click="onShuffle"
			>
				<template #icon>
					<N8nIcon
						:key="shuffles"
						icon="refresh-cw"
						size="small"
						:class="{ [$style.shuffleIcon]: shuffles > 0 }"
					/>
				</template>
				{{ i18n.baseText('auth.avatar.generate.shuffle') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.bottomRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}

.presets {
	display: flex;
	gap: var(--spacing--2xs);
}

.preset {
	appearance: none;
	width: 22px;
	height: 22px;
	padding: 0;
	border: none;
	border-radius: 50%;
	cursor: pointer;
	/* A hairline that reads on both themes, so a swatch near the dialog's own color keeps an edge. */
	box-shadow: inset 0 0 0 1px
		light-dark(var(--color--black-alpha-100), var(--color--white-alpha-100));
	transition:
		transform var(--duration--snappy) var(--easing--ease-out-quint),
		box-shadow var(--duration--snappy) var(--easing--ease-out);

	/* A tap leaves hover stuck on touch screens, so only a real pointer grows a swatch. */
	@media (hover: hover) and (pointer: fine) {
		&:hover:not(:disabled) {
			transform: scale(1.15);
		}
	}

	&:active:not(:disabled) {
		transform: scale(0.96);
	}

	&:disabled {
		cursor: not-allowed;
	}

	@include focus.focus-visible-ring-offset;

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.presetActive {
	box-shadow:
		0 0 0 2px var(--avatar-dialog--surface, var(--background--surface)),
		0 0 0 3.5px var(--color--primary);
}

/*
 * One clockwise turn per shuffle, on the same beat the orb glides to its new
 * arrangement (set by the dialog), so the icon reads as what drives the change.
 */
.shuffleIcon {
	transform-origin: center;
	animation: shuffleSpin var(--avatar-morph--duration, var(--duration--base))
		var(--avatar-morph--easing, var(--easing--ease-in-out));

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

@keyframes shuffleSpin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
