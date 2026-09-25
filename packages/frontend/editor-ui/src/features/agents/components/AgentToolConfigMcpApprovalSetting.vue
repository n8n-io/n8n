<script setup lang="ts">
import type { AgentApproval, McpToolPermissions } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode, INodePropertyOptions } from 'n8n-workflow';
import { computed, onMounted, ref } from 'vue';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import AgentApprovalSelector, { type ApprovalMode } from './AgentApprovalSelector.vue';

const props = defineProps<{
	modelValue: McpToolPermissions;
	node: INode;
	projectId?: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: McpToolPermissions];
	'update:valid': [valid: boolean];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const tools = ref<INodePropertyOptions[]>([]);
const isLoadingTools = ref(false);
const loadingError = ref<string | null>(null);

const exposedToolNames = computed(() => {
	const names = tools.value.map((tool) => String(tool.value));
	const includeMode = props.node.parameters.include;
	const includeTools = toStringArray(props.node.parameters.includeTools);
	const excludeTools = new Set(toStringArray(props.node.parameters.excludeTools));

	if (includeMode === 'selected' && includeTools.length > 0) {
		const allowedTools = new Set(includeTools);
		return names.filter((name) => allowedTools.has(name));
	}

	if (includeMode === 'except') {
		return names.filter((name) => !excludeTools.has(name));
	}

	return names;
});

const selectorValue = computed<AgentApproval | undefined>(() => {
	const { categories, tools } = props.modelValue;
	if (categories.read === 'require_approval' && categories.write === 'require_approval') {
		return { mode: 'global' };
	}

	const selectedTools = Object.entries(tools ?? {}).flatMap(([name, permission]) =>
		permission === 'require_approval' ? [name] : [],
	);
	return selectedTools.length > 0 ? { mode: 'selected', tools: selectedTools } : undefined;
});

const toolOptions = computed(() => {
	const exposed = new Set(exposedToolNames.value);
	return tools.value
		.filter((tool) => exposed.has(String(tool.value)))
		.map((tool) => ({
			label: tool.name,
			value: String(tool.value),
		}));
});

onMounted(() => {
	if (props.node.parameters.endpointUrl || props.node.parameters.sseEndpoint) {
		void refreshTools();
	}
});

function toStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

async function refreshTools() {
	isLoadingTools.value = true;
	loadingError.value = null;

	try {
		tools.value = await nodeTypesStore.getNodeParameterOptions({
			nodeTypeAndVersion: {
				name: props.node.type,
				version: props.node.typeVersion,
			},
			path: 'parameters.includeTools',
			methodName: 'getTools',
			currentNodeParameters: props.node.parameters,
			credentials: props.node.credentials,
			projectId: props.projectId,
		});
	} catch (error) {
		loadingError.value = error instanceof Error ? error.message : String(error);
	} finally {
		isLoadingTools.value = false;
	}
}

function handleModeUpdate(mode: ApprovalMode) {
	if (mode === 'selected' && tools.value.length === 0 && !isLoadingTools.value) {
		void refreshTools();
	}
}

function toToolPermissions(approval: AgentApproval | undefined): McpToolPermissions {
	if (approval?.mode === 'global') {
		return {
			categories: {
				read: 'require_approval',
				write: 'require_approval',
			},
		};
	}

	const categories = {
		read: 'always_allow' as const,
		write: 'always_allow' as const,
	};
	if (approval?.mode !== 'selected' || approval.tools.length === 0) return { categories };

	return {
		categories,
		tools: Object.fromEntries(
			approval.tools.map((toolName) => [toolName, 'require_approval' as const]),
		),
	};
}
</script>

<template>
	<AgentApprovalSelector
		:model-value="selectorValue"
		:options="toolOptions"
		:label="i18n.baseText('agents.toolConfig.mcpApproval.label')"
		:hint="i18n.baseText('agents.toolConfig.mcpApproval.hint')"
		:placeholder="i18n.baseText('agents.toolConfig.mcpApproval.tools.placeholder')"
		:loading="isLoadingTools"
		:error="loadingError ? i18n.baseText('agents.toolConfig.mcpApproval.loadError') : null"
		test-id-prefix="agent-mcp-approval"
		@update:model-value="emit('update:modelValue', toToolPermissions($event))"
		@update:valid="emit('update:valid', $event)"
		@update:mode="handleModeUpdate"
	>
		<template #controls="{ mode }">
			<N8nTooltip
				v-if="mode === 'selected'"
				:content="i18n.baseText('agents.toolConfig.mcpApproval.refresh.hint')"
			>
				<N8nButton
					variant="subtle"
					size="small"
					icon-only
					:loading="isLoadingTools"
					:aria-label="i18n.baseText('agents.toolConfig.mcpApproval.refresh')"
					data-test-id="agent-mcp-approval-refresh"
					@click="refreshTools"
				>
					<template #icon>
						<N8nIcon icon="refresh-cw" :size="14" />
					</template>
				</N8nButton>
			</N8nTooltip>
		</template>
	</AgentApprovalSelector>
</template>
