<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nPopover from '../N8nPopover';

defineOptions({ name: 'IconColorPicker' });

const { t } = useI18n();

const model = defineModel<string | undefined>({ default: undefined });
const isOpen = ref(false);

const DEFAULT_COLOR_VARIABLE = '--node--icon--color--neutral';

const colors = [
	{ name: 'blue', variable: '--node--icon--color--blue', label: 'Blue' },
	{ name: 'light-blue', variable: '--node--icon--color--light-blue', label: 'Light Blue' },
	{ name: 'azure', variable: '--node--icon--color--azure', label: 'Azure' },
	{ name: 'purple', variable: '--node--icon--color--purple', label: 'Purple' },
	{ name: 'pink-red', variable: '--node--icon--color--pink-red', label: 'Pink' },
	{ name: 'red', variable: '--node--icon--color--red', label: 'Red' },
	{ name: 'orange', variable: '--node--icon--color--orange', label: 'Orange' },
	{ name: 'green', variable: '--node--icon--color--green', label: 'Green' },
	{ name: 'dark-green', variable: '--node--icon--color--dark-green', label: 'Dark Green' },
	{ name: 'neutral', variable: '--node--icon--color--neutral', label: 'Gray' },
] as const;

/** The effective color variable, treating undefined (no selection) as neutral/gray. */
const effectiveColor = computed(() => model.value ?? DEFAULT_COLOR_VARIABLE);

const displayColor = computed(() => `var(${effectiveColor.value})`);

function isActive(variable: string): boolean {
	return effectiveColor.value === variable;
}

function selectColor(variable: string) {
	model.value = variable;
	isOpen.value = false;
}

function getColorLabel(color: (typeof colors)[number]): string {
	return color.label;
}

defineExpose({ isOpen });
</script>

<template>
	<N8nPopover
		v-model:open="isOpen"
		side="bottom"
		align="end"
		:enable-scrolling="false"
		:suppress-auto-focus="true"
		:teleported="false"
	>
		<template #trigger>
			<N8nButton
				:class="$style.triggerButton"
				type="tertiary"
				size="medium"
				:square="true"
				:aria-label="t('iconPicker.colorPicker.selectColor')"
				data-test-id="icon-color-picker-trigger"
			>
				<span
					:class="$style.triggerCircle"
					:style="{ backgroundColor: displayColor }"
				/>
			</N8nButton>
		</template>
		<template #content>
			<div
				:class="$style.colorGrid"
				role="radiogroup"
				:aria-label="t('iconPicker.colorPicker.tooltip')"
				data-test-id="icon-color-picker-popover"
			>
				<button
					v-for="color in colors"
					:key="color.name"
					:class="[
						$style.swatch,
						{ [$style.active]: isActive(color.variable) },
					]"
					type="button"
					role="radio"
					:aria-checked="isActive(color.variable)"
					:aria-label="getColorLabel(color)"
					:title="getColorLabel(color)"
					:data-test-id="`icon-color-${color.name}`"
					@click="selectColor(color.variable)"
				>
					<span
						:class="$style.swatchInner"
						:style="{ backgroundColor: `var(${color.variable})` }"
					/>
				</button>
			</div>
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
.triggerButton {
	display: inline-flex !important;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: 0 !important;
}

.triggerCircle {
	display: block;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	flex-shrink: 0;
}

.colorGrid {
	display: grid;
	grid-template-columns: repeat(5, 24px);
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs);
	justify-content: center;
}

.swatch {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	padding: 0;
	border: 2px solid transparent;
	border-radius: 50%;
	cursor: pointer;
	background: none;
	transition: border-color 0.15s ease;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}

	&.active {
		border-color: var(--color--primary);
	}
}

.swatchInner {
	display: block;
	width: 16px;
	height: 16px;
	border-radius: 50%;
}
</style>
