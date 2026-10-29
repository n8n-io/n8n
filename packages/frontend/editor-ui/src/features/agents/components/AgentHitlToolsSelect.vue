<script setup lang="ts">
import { computed } from 'vue';
import type { AgentJsonConfig } from '@n8n/api-types';
import { N8nIcon, N8nSelect2, type IconName, type SelectOptionBase } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import type { SimplifiedNodeType } from '@/Interface';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import { hitlMcpServerKey, hitlToolKey } from '../utils/hitlConfiguration';
import AgentChipButton from './AgentChipButton.vue';

const props = defineProps<{
	modelValue: string[];
	config: AgentJsonConfig | null;
	getCustomToolName?: (id: string) => string | undefined;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
type ToolOption = SelectOptionBase<string> & {
	icon: IconName;
	nodeType: SimplifiedNodeType | null;
};
const options = computed<ToolOption[]>(() => [
	...(props.config?.tools ?? []).map<ToolOption>((tool) => ({
		value: hitlToolKey(tool),
		label: formatToolNameForDisplay(
			tool.type === 'custom'
				? (props.getCustomToolName?.(tool.id) ?? tool.id)
				: tool.type === 'workflow'
					? (tool.name ?? tool.workflow)
					: tool.name,
		),
		icon: tool.type === 'workflow' ? 'workflow' : tool.type === 'custom' ? 'code' : 'globe',
		nodeType:
			tool.type === 'node'
				? (nodeTypesStore.getNodeType(tool.node.nodeType, tool.node.nodeTypeVersion) ?? null)
				: null,
	})),
	...(props.config?.mcpServers ?? []).map<ToolOption>((server) => ({
		value: hitlMcpServerKey(server.name),
		label: formatToolNameForDisplay(server.name),
		icon: 'mcp',
		nodeType:
			nodeTypesStore.getNodeType(server.metadata?.nodeTypeName ?? AI_MCP_TOOL_NODE_TYPE) ?? null,
	})),
]);
const selected = computed(() =>
	options.value.filter((option) => props.modelValue.includes(option.value)),
);
const optionByValue = computed(
	() => new Map(options.value.map((option) => [option.value, option])),
);

function update(value: unknown) {
	if (Array.isArray(value) && value.every((key): key is string => typeof key === 'string'))
		emit('update:modelValue', value);
}
</script>

<template>
	<N8nSelect2
		:items="options"
		:model-value="modelValue"
		multiple
		size="large"
		:aria-label="i18n.baseText('agents.hitl.tools')"
		:placeholder="i18n.baseText('agents.hitl.toolsPlaceholder')"
		data-testid="agent-hitl-tools"
		@update:model-value="update"
	>
		<template #default>
			<span v-if="selected.length" :class="$style.tags">
				<AgentChipButton
					v-for="tool in selected"
					:key="tool.value"
					:clickable="false"
					:icon="tool.nodeType ? undefined : tool.icon"
					:title="tool.label"
					:class="$style.tag"
					data-testid="agent-hitl-tool-tag"
				>
					<template v-if="tool.nodeType" #icon
						><NodeIcon :node-type="tool.nodeType" :size="16"
					/></template>
					{{ tool.label }}
				</AgentChipButton>
			</span>
			<span v-else :class="$style.placeholder">{{
				i18n.baseText('agents.hitl.toolsPlaceholder')
			}}</span>
		</template>
		<template #item-leading="{ item, ui }">
			<NodeIcon
				v-if="optionByValue.get(String(item.value))?.nodeType"
				:node-type="optionByValue.get(String(item.value))?.nodeType"
				:size="16"
				:class="ui.class"
			/>
			<N8nIcon
				v-else
				:icon="optionByValue.get(String(item.value))?.icon ?? 'globe'"
				:size="16"
				:class="ui.class"
			/>
		</template>
	</N8nSelect2>
</template>

<style module lang="scss">
.tags {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	// Keep pill shadows inside the select's clipped value area.
	padding: var(--spacing--5xs);
}
.tag {
	height: var(--height--sm);
	max-width: 100%;
}
.placeholder {
	color: var(--input--placeholder--color);
}
</style>
