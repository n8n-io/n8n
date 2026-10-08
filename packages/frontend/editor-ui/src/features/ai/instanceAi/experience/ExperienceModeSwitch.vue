<script setup lang="ts">
import { computed, useId } from 'vue';
import type { ExperienceMode } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import {
	N8nHeading,
	N8nIconButton,
	N8nSegmentControl,
	N8nText,
	N8nTooltip,
	type IconName,
} from '@n8n/design-system';
import { HOVER_DELAY } from '@/app/constants';
import { oppositeExperienceMode } from './experienceMode';
import { useExperienceMode } from './useExperienceMode';

const props = withDefaults(
	defineProps<{
		isCollapsed: boolean;
		variant?: 'sidebar' | 'settings';
	}>(),
	{ variant: 'sidebar' },
);

const MODES: ExperienceMode[] = ['simple', 'power'];
const MODE_ICONS: Record<ExperienceMode, IconName> = {
	simple: 'message-square',
	power: 'sliders-horizontal',
};
// Hover intent, so a pointer that only passes over the footer opens no tooltip.
const TOOLTIP_DELAY = HOVER_DELAY.SHOW;

const i18n = useI18n();
const { isEnabled, mode, setMode } = useExperienceMode();
const labelId = useId();
const descriptionId = useId();

const isSettings = computed(() => props.variant === 'settings');
const showToggle = computed(() => props.isCollapsed && !isSettings.value);
const options = computed(() =>
	MODES.map((value) => ({ value, label: i18n.baseText(`experienceMode.option.${value}`) })),
);
const toggleLabel = computed(() => i18n.baseText(`experienceMode.toggle.${mode.value}`));

function describe(value: ExperienceMode) {
	return i18n.baseText(`experienceMode.description.${value}`);
}

async function onSelect(value: ExperienceMode) {
	await setMode(value);
}

// The collapsed button changes the mode out of sight, so it confirms the change.
async function onToggle() {
	await setMode(oppositeExperienceMode(mode.value), { announce: true });
}
</script>

<template>
	<div v-if="isEnabled && showToggle" :class="$style.collapsed">
		<N8nTooltip :content="toggleLabel" placement="right" :show-after="TOOLTIP_DELAY" as-child>
			<N8nIconButton
				variant="ghost"
				size="small"
				:icon="MODE_ICONS[mode]"
				icon-size="large"
				:aria-label="toggleLabel"
				data-test-id="experience-mode-toggle"
				@click="onToggle"
			/>
		</N8nTooltip>
	</div>
	<div v-else-if="isEnabled" :class="isSettings ? undefined : $style.sidebar">
		<div v-if="isSettings" class="mb-s">
			<N8nHeading :id="labelId" size="large">{{
				i18n.baseText('experienceMode.label')
			}}</N8nHeading>
		</div>
		<N8nText v-else :id="labelId" size="small" bold color="text-base" :class="$style.label">
			{{ i18n.baseText('experienceMode.label') }}
		</N8nText>
		<N8nSegmentControl
			:model-value="mode"
			:options="options"
			:size="isSettings ? 'default' : 'small'"
			:class="$style.control"
			:aria-labelledby="labelId"
			:aria-describedby="descriptionId"
			data-test-id="experience-mode-switch"
			@update:model-value="onSelect"
		>
			<template #option="option">
				<N8nTooltip
					:content="describe(option.value)"
					:disabled="isSettings"
					placement="top"
					:show-after="TOOLTIP_DELAY"
					as-child
				>
					<span :data-test-id="`experience-mode-option-${option.value}`">{{ option.label }}</span>
				</N8nTooltip>
			</template>
		</N8nSegmentControl>
		<!-- Visible help text in Settings. In the sidebar, the same text is hidden and only
		     describes the group to screen readers, because the option tooltips need a pointer. -->
		<dl :id="descriptionId" :class="$style.descriptions" :hidden="!isSettings">
			<template v-for="option in options" :key="option.value">
				<dt :class="$style.term">{{ option.label }}</dt>
				<dd :class="$style.definition">{{ describe(option.value) }}</dd>
			</template>
		</dl>
	</div>
</template>

<style lang="scss" module>
.collapsed {
	padding: var(--spacing--3xs);
}

.sidebar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--4xs) var(--spacing--3xs);
	padding: var(--spacing--3xs);
}

.label {
	padding-inline-start: var(--spacing--3xs);
}

// The unselected option uses the subtle text colour, which is below AA on the
// control background. A variable override keeps the design-system styles.
.control {
	--text-color--subtle: var(--text-color);
}

.descriptions {
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: var(--spacing--4xs) var(--spacing--xs);
	margin: var(--spacing--xs) 0 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);

	&[hidden] {
		display: none;
	}
}

.term {
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
}

.definition {
	margin: 0;
	color: var(--text-color--subtle);
}
</style>
