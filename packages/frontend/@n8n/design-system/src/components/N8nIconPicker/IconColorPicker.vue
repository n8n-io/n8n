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
	{ name: 'blue', variable: '--node--icon--color--blue', labelKey: 'iconPicker.colorPicker.blue' },
	{
		name: 'light-blue',
		variable: '--node--icon--color--light-blue',
		labelKey: 'iconPicker.colorPicker.lightBlue',
	},
	{
		name: 'azure',
		variable: '--node--icon--color--azure',
		labelKey: 'iconPicker.colorPicker.azure',
	},
	{
		name: 'purple',
		variable: '--node--icon--color--purple',
		labelKey: 'iconPicker.colorPicker.purple',
	},
	{
		name: 'pink-red',
		variable: '--node--icon--color--pink-red',
		labelKey: 'iconPicker.colorPicker.pink',
	},
	{ name: 'red', variable: '--node--icon--color--red', labelKey: 'iconPicker.colorPicker.red' },
	{
		name: 'orange',
		variable: '--node--icon--color--orange',
		labelKey: 'iconPicker.colorPicker.orange',
	},
	{
		name: 'green',
		variable: '--node--icon--color--green',
		labelKey: 'iconPicker.colorPicker.green',
	},
	{
		name: 'dark-green',
		variable: '--node--icon--color--dark-green',
		labelKey: 'iconPicker.colorPicker.darkGreen',
	},
	{
		name: 'neutral',
		variable: '--node--icon--color--neutral',
		labelKey: 'iconPicker.colorPicker.gray',
	},
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
	return t(color.labelKey);
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
				variant="outline"
				size="medium"
				icon-only
				:aria-label="t('iconPicker.colorPicker.selectColor')"
				data-test-id="icon-color-picker-trigger"
			>
				<span :class="$style.triggerCircle" :style="{ backgroundColor: displayColor }" />
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
					:class="[$style.swatch, { [$style.active]: isActive(color.variable) }]"
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
	flex-shrink: 0;
}

.triggerCircle {
	display: block;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	border-radius: 50%;
	flex-shrink: 0;
}

.colorGrid {
	display: grid;
	grid-template-columns: repeat(5, var(--spacing--lg));
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs);
	justify-content: center;
}

.swatch {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	padding: 0;
	border: var(--border-width) solid transparent;
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
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	border-radius: 50%;
}
</style>
