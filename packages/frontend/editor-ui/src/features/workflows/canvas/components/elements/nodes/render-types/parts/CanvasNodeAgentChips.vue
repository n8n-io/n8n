<script setup lang="ts">
import { computed } from 'vue';
import { N8nActionDropdown, N8nIcon, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { type AgentCardChip, MAX_INLINE_AGENT_CHIPS } from './canvasNodeAgentChips.utils';

const props = withDefaults(
	defineProps<{
		chips: AgentCardChip[];
		maxInline?: number;
	}>(),
	{ maxInline: MAX_INLINE_AGENT_CHIPS },
);

const i18n = useI18n();

const inlineChips = computed(() => props.chips.slice(0, props.maxInline));
const overflowChips = computed(() => props.chips.slice(props.maxInline));
const overflowItems = computed<Array<ActionDropdownItem<string>>>(() =>
	overflowChips.value.map((chip) => ({ id: chip.key, label: chip.label, icon: chip.icon })),
);
</script>

<template>
	<div :class="$style.chips" data-test-id="canvas-node-agent-chips">
		<span
			v-for="chip in inlineChips"
			:key="chip.key"
			:class="$style.chip"
			data-test-id="canvas-node-agent-chip"
		>
			<N8nIcon :icon="chip.icon" :size="16" :class="$style.chipIcon" />
			<N8nText size="small" :class="$style.chipLabel">{{ chip.label }}</N8nText>
		</span>
		<N8nActionDropdown
			v-if="overflowChips.length"
			:items="overflowItems"
			placement="bottom-start"
			:class="['nodrag', 'nowheel']"
			data-test-id="canvas-node-agent-chips-overflow"
		>
			<template #activator>
				<span :class="[$style.chip, $style.overflow]">
					<N8nText size="small" :class="$style.chipLabel">
						{{
							i18n.baseText('agentNode.card.moreChips', {
								interpolate: { count: overflowChips.length },
							})
						}}
					</N8nText>
				</span>
			</template>
		</N8nActionDropdown>
	</div>
</template>

<style lang="scss" module>
.chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	max-width: 100%;
	padding: var(--spacing--5xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: var(--background--surface);
	box-shadow: var(--shadow--xs);
}

.overflow {
	cursor: pointer;
}

.chipIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.chipLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color--subtle);
}
</style>
