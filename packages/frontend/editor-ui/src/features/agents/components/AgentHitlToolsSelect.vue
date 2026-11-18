<script setup lang="ts">
import { computed } from 'vue';
import type { AgentJsonConfig } from '@n8n/api-types';
import { N8nIcon, type IconName, type DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import type { SimplifiedNodeType } from '@/Interface';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import { hitlMcpServerKey, hitlToolKey } from '../utils/hitlConfiguration';
import AgentPillField from './AgentPillField.vue';

const props = defineProps<{
	modelValue: string[];
	config: AgentJsonConfig | null;
	disabled?: boolean;
	embedded?: boolean;
	getCustomToolName?: (id: string) => string | undefined;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
type ToolOption = {
	value: string;
	label: string;
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
const optionByValue = computed(
	() => new Map(options.value.map((option) => [option.value, option])),
);
const selected = computed(() =>
	props.modelValue
		.map((value) => optionByValue.value.get(value))
		.filter((option): option is ToolOption => !!option),
);
const available = computed<Array<DropdownMenuItemProps<string>>>(() =>
	options.value
		.filter((option) => !props.modelValue.includes(option.value))
		.map((option) => ({
			id: option.value,
			label: option.label,
			icon: { type: 'icon', value: option.icon },
		})),
);
function add(value: string) {
	if (props.disabled || props.modelValue.includes(value) || !optionByValue.value.has(value)) return;
	emit('update:modelValue', [...props.modelValue, value]);
}
function remove(value: string) {
	if (!props.disabled)
		emit(
			'update:modelValue',
			props.modelValue.filter((key) => key !== value),
		);
}
</script>

<template>
	<AgentPillField
		:label="i18n.baseText('agents.hitl.tools')"
		:add-label="i18n.baseText('agents.hitl.addTool')"
		:pills="selected"
		:items="available"
		:disabled="disabled"
		:embedded="embedded"
		test-id="agent-hitl-tool"
		@select="add"
		@remove="remove"
	>
		<template #pill-icon="{ item }">
			<NodeIcon
				v-if="optionByValue.get(item.value)?.nodeType"
				:node-type="optionByValue.get(item.value)?.nodeType"
				:size="16"
			/>
			<N8nIcon v-else :icon="item.icon ?? 'globe'" :size="16" />
		</template>
		<template #item-leading="{ item, ui }">
			<NodeIcon
				v-if="optionByValue.get(item.id)?.nodeType"
				:node-type="optionByValue.get(item.id)?.nodeType"
				:size="16"
				:class="ui.class"
			/>
			<N8nIcon
				v-else
				:icon="optionByValue.get(item.id)?.icon ?? 'globe'"
				:size="16"
				:class="ui.class"
			/>
		</template>
	</AgentPillField>
</template>
