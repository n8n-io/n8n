<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nOption, N8nSelect, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode, INodePropertyOptions } from 'n8n-workflow';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { AgentJsonMcpServerConfig } from '../types';

type ApprovalMode = 'disabled' | 'global' | 'selected';

const props = defineProps<{
	modelValue?: AgentJsonMcpServerConfig['approval'];
	node: INode;
	projectId?: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: AgentJsonMcpServerConfig['approval'] | undefined];
	'update:valid': [valid: boolean];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const approvalMode = ref<ApprovalMode>('disabled');
const selectedTools = ref<string[]>([]);
const tools = ref<INodePropertyOptions[]>([]);
const isLoadingTools = ref(false);
const loadingError = ref<string | null>(null);

const modeOptions = computed(() => [
	{ label: i18n.baseText('agents.toolConfig.mcpApproval.disabled'), value: 'disabled' },
	{ label: i18n.baseText('agents.toolConfig.mcpApproval.askAll'), value: 'global' },
	{
		label: i18n.baseText('agents.toolConfig.mcpApproval.askSelected'),
		value: 'selected',
	},
]);

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

const exposedToolOptions = computed(() => {
	const exposed = new Set(exposedToolNames.value);
	return tools.value
		.filter((tool) => exposed.has(String(tool.value)))
		.map((tool) => ({
			label: tool.name,
			value: String(tool.value),
		}));
});

const isValid = computed(() => approvalMode.value !== 'selected' || selectedTools.value.length > 0);

watch(
	() => props.modelValue,
	(approval) => {
		if (!approval) {
			approvalMode.value = 'disabled';
			selectedTools.value = [];
			return;
		}

		approvalMode.value = approval.mode;
		selectedTools.value = approval.mode === 'selected' ? approval.tools : [];
	},
	{ immediate: true },
);

watch(isValid, (valid) => emit('update:valid', valid), { immediate: true });

watch(exposedToolNames, (names) => {
	if (approvalMode.value !== 'selected' || names.length === 0) return;

	const exposed = new Set(names);
	const prunedTools = selectedTools.value.filter((tool) => exposed.has(tool));
	if (prunedTools.length !== selectedTools.value.length) {
		selectedTools.value = prunedTools;
		emitApproval();
	}
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

function toApprovalMode(value: unknown): ApprovalMode {
	return value === 'global' || value === 'selected' ? value : 'disabled';
}

function emitApproval() {
	if (approvalMode.value === 'global') {
		emit('update:modelValue', { mode: 'global' });
		return;
	}

	if (approvalMode.value === 'selected') {
		emit('update:modelValue', { mode: 'selected', tools: selectedTools.value });
		return;
	}

	emit('update:modelValue', undefined);
}

function handleModeUpdate(value: unknown) {
	approvalMode.value = toApprovalMode(value);
	emitApproval();

	if (approvalMode.value === 'selected' && tools.value.length === 0 && !isLoadingTools.value) {
		void refreshTools();
	}
}

function handleSelectedToolsUpdate(value: unknown) {
	selectedTools.value = toStringArray(value);
	emitApproval();
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
</script>

<template>
	<div :class="$style.approvalRow">
		<div :class="$style.approvalText">
			<N8nText size="small" :bold="true">
				{{ i18n.baseText('agents.toolConfig.mcpApproval.label') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.toolConfig.mcpApproval.hint') }}
			</N8nText>
		</div>

		<div :class="$style.controls">
			<N8nSelect
				:model-value="approvalMode"
				size="small"
				data-test-id="agent-mcp-approval-mode"
				:class="$style.modeSelect"
				@update:model-value="handleModeUpdate"
			>
				<N8nOption
					v-for="option in modeOptions"
					:key="option.value"
					:value="option.value"
					:label="option.label"
				/>
			</N8nSelect>
			<N8nTooltip
				v-if="approvalMode === 'selected'"
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
		</div>

		<N8nSelect
			v-if="approvalMode === 'selected'"
			:model-value="selectedTools"
			multiple
			filterable
			size="small"
			:loading="isLoadingTools"
			:placeholder="i18n.baseText('agents.toolConfig.mcpApproval.tools.placeholder')"
			data-test-id="agent-mcp-approval-tools"
			@update:model-value="handleSelectedToolsUpdate"
		>
			<N8nOption
				v-for="tool in exposedToolOptions"
				:key="tool.value"
				:value="tool.value"
				:label="tool.label"
			/>
		</N8nSelect>

		<N8nText v-if="loadingError && approvalMode === 'selected'" size="xsmall" color="danger">
			{{ i18n.baseText('agents.toolConfig.mcpApproval.loadError') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.approvalRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	margin-right: var(--spacing--lg);
}

.approvalText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.modeSelect {
	width: 180px;
}
</style>
