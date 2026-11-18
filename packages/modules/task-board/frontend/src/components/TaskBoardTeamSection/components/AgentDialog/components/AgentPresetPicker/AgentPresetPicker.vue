<script setup lang="ts">
import { N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { AGENT_PRESETS, type AgentPresetKey } from '../../../../../../presets/agent-presets';

defineProps<{ selected: AgentPresetKey; disabled: boolean }>();
const emit = defineEmits<{ select: [key: AgentPresetKey] }>();
const i18n = useI18n();
</script>

<template>
	<div
		role="radiogroup"
		:aria-label="i18n.baseText('taskBoard.team.form.presets')"
		:class="$style.presets"
	>
		<N8nCard
			v-for="preset in AGENT_PRESETS"
			:key="preset.key"
			role="radio"
			:tabindex="disabled ? -1 : 0"
			hoverable
			:aria-checked="selected === preset.key"
			:aria-disabled="disabled"
			:class="[$style.preset, { [$style.selected]: selected === preset.key }]"
			data-test-id="task-board-agent-preset"
			:data-attr="`task-board-agent-preset-${preset.key}`"
			@click="!disabled && emit('select', preset.key)"
			@keydown.enter.prevent="!disabled && emit('select', preset.key)"
			@keydown.space.prevent="!disabled && emit('select', preset.key)"
		>
			<template #prepend>
				<N8nIcon :icon="preset.icon" size="large" />
			</template>
			<template #header>
				<N8nText bold size="small">{{ i18n.baseText(preset.nameKey) }}</N8nText>
			</template>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText(preset.descriptionKey) }}
			</N8nText>
		</N8nCard>
	</div>
</template>

<style lang="scss" module>
.presets {
	display: grid;
	/* A readable minimum card width. The spacing scale has no token this wide. */
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 11rem), 1fr));
	gap: var(--spacing--xs);
}

.preset {
	cursor: pointer;
	align-items: flex-start;
	gap: var(--spacing--2xs);

	&:focus-visible {
		border-color: var(--focus--border-color);
	}
}

.selected {
	border-color: var(--color--primary);
	background-color: var(--background--active);
}
</style>
