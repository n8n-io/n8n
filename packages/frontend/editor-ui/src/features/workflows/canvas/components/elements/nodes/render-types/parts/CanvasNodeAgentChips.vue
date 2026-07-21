<script setup lang="ts">
import { computed } from 'vue';
import { N8nActionDropdown } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import AgentChipButton from '@/features/agents/components/AgentChipButton.vue';
import { type AgentCardChip, MAX_INLINE_AGENT_CHIPS } from './canvasNodeAgentChips.utils';

const props = withDefaults(
	defineProps<{
		chips: AgentCardChip[];
		maxInline?: number;
		isReadOnly?: boolean;
	}>(),
	{ maxInline: MAX_INLINE_AGENT_CHIPS, isReadOnly: false },
);

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

// Node-tool chips render the node's own icon; resolve the description up front
// (null when the node type isn't loaded → fall back to the chip's icon name).
const inlineChips = computed(() =>
	props.chips.slice(0, props.maxInline).map((chip) => ({
		...chip,
		nodeTypeDescription: chip.nodeType
			? nodeTypesStore.getNodeType(chip.nodeType, chip.nodeTypeVersion)
			: null,
	})),
);
const overflowChips = computed(() => props.chips.slice(props.maxInline));
const overflowItems = computed<Array<ActionDropdownItem<string>>>(() =>
	overflowChips.value.map((chip) => ({ id: chip.key, label: chip.label, icon: chip.icon })),
);
</script>

<template>
	<div :class="$style.chips" data-test-id="canvas-node-agent-chips">
		<AgentChipButton
			v-for="chip in inlineChips"
			:key="chip.key"
			:icon="chip.nodeTypeDescription ? undefined : chip.icon"
			:clickable="false"
			data-test-id="canvas-node-agent-chip"
		>
			<template v-if="chip.nodeTypeDescription" #icon>
				<NodeIcon :node-type="chip.nodeTypeDescription" :size="16" :class="$style.nodeIcon" />
			</template>
			{{ chip.label }}
		</AgentChipButton>
		<AgentChipButton
			v-if="overflowChips.length && isReadOnly"
			:clickable="false"
			data-test-id="canvas-node-agent-chips-overflow"
		>
			{{
				i18n.baseText('agentNode.card.moreChips', {
					interpolate: { count: overflowChips.length },
				})
			}}
		</AgentChipButton>
		<N8nActionDropdown
			v-else-if="overflowChips.length"
			:items="overflowItems"
			placement="bottom-start"
			:class="['nodrag', 'nowheel']"
			data-test-id="canvas-node-agent-chips-overflow"
		>
			<template #activator>
				<AgentChipButton>
					{{
						i18n.baseText('agentNode.card.moreChips', {
							interpolate: { count: overflowChips.length },
						})
					}}
				</AgentChipButton>
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

.nodeIcon {
	flex-shrink: 0;
}
</style>
