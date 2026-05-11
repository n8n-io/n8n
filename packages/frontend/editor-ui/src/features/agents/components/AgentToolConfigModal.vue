<script setup lang="ts">
/**
 * Configure a single tool (node or workflow) on an agent.
 *
 * Takes an `AgentJsonToolRef` (the persisted shape from `@n8n/api-types`) and
 * renders the appropriate form:
 *   - `type: 'node'`   → shared `NodeToolSettingsContent` (NDV-style param form)
 *   - `type: 'workflow'` → small `WorkflowToolConfigContent` (description +
 *                          allOutputs toggle)
 *   - `type: 'custom'` → read-only TypeScript source viewer
 *
 * On Save, edits are merged back into the ref:
 *   - Node tools round-trip via `updateToolRefFromNode`.
 *   - Workflow tools round-trip via `updateWorkflowToolRef`.
 */
import { computed, ref } from 'vue';
import Modal from '@/app/components/Modal.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import NodeToolSettingsContent from '@/features/shared/toolConfig/NodeToolSettingsContent.vue';
import WorkflowToolConfigContent from './WorkflowToolConfigContent.vue';
import { useUIStore } from '@/app/stores/ui.store';
import {
	N8nButton,
	N8nIcon,
	N8nInlineTextEdit,
	N8nRadioButtons,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode } from 'n8n-workflow';

import type { AgentJsonToolRef, CustomToolEntry } from '../types';
import {
	toolRefToNode,
	updateToolRefFromNode,
	updateWorkflowToolRef,
} from '../composables/useAgentToolRefAdapter';
import AgentJsonEditor from './AgentJsonEditor.vue';
import AgentCustomToolViewer from './AgentCustomToolViewer.vue';

const props = defineProps<{
	modalName: string;
	data: {
		toolRef: AgentJsonToolRef;
		customTool?: CustomToolEntry;
		existingToolNames?: string[];
		projectId?: string;
		agentId?: string;
		onConfirm: (updatedRef: AgentJsonToolRef) => void;
		onRemove?: () => void;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const isWorkflowTool = computed(() => props.data.toolRef.type === 'workflow');
const isCustomTool = computed(() => props.data.toolRef.type === 'custom');

const nodeContentRef = ref<InstanceType<typeof NodeToolSettingsContent> | null>(null);
const workflowContentRef = ref<InstanceType<typeof WorkflowToolConfigContent> | null>(null);
const isValid = ref(false);
const activeView = ref<'config' | 'raw'>('config');

/** Derive an INode view of a node-type ref once. Null for workflow/custom refs. */
const initialNode = computed<INode | null>(() =>
	isWorkflowTool.value || isCustomTool.value ? null : toolRefToNode(props.data.toolRef),
);
const initialName = computed(() => props.data.toolRef.name ?? initialNode.value?.name ?? '');
const nodeName = ref(initialName.value);
const customToolCode = computed(() => props.data.customTool?.code ?? '');
const customToolTitle = computed(
	() =>
		props.data.customTool?.descriptor.name ??
		props.data.toolRef.name ??
		props.data.toolRef.id ??
		i18n.baseText('agents.builder.tree.customBadge'),
);

const viewOptions = computed(() => [
	{ label: 'Config', value: 'config' as const },
	{ label: 'Raw', value: 'raw' as const },
]);

/** Gate the modal render — for node tools we need a resolvable node; workflow
 *  and custom tools render from data that is already on the ref/agent. */
const canRender = computed(
	() => isCustomTool.value || isWorkflowTool.value || initialNode.value !== null,
);

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function handleConfirm() {
	if (isCustomTool.value) {
		closeDialog();
		return;
	}

	if (isWorkflowTool.value) {
		const wc = workflowContentRef.value;
		if (!wc) return;
		const updatedRef = updateWorkflowToolRef(props.data.toolRef, {
			name: wc.name,
			description: wc.description,
			allOutputs: wc.allOutputs,
		});
		props.data.onConfirm(updatedRef);
		closeDialog();
		return;
	}

	const currentNode = nodeContentRef.value?.node;
	if (!currentNode) return;
	const updatedRef = updateToolRefFromNode(props.data.toolRef, currentNode);
	props.data.onConfirm(updatedRef);
	closeDialog();
}

function handleCancel() {
	closeDialog();
}

function handleRemove() {
	props.data.onRemove?.();
	closeDialog();
}

function handleChangeName(name: string) {
	if (isCustomTool.value) return;

	if (isWorkflowTool.value) {
		workflowContentRef.value?.handleChangeName(name);
	} else {
		nodeContentRef.value?.handleChangeName(name);
	}
}

function handleValidUpdate(valid: boolean) {
	isValid.value = valid;
}

function handleNodeNameUpdate(name: string) {
	nodeName.value = name;
}
</script>

<template>
	<Modal
		v-if="canRender"
		:name="modalName"
		width="780px"
		max-height="85vh"
		data-test-id="agent-tool-config-modal"
	>
		<template #header>
			<div :class="$style.header">
				<NodeIcon
					v-if="!isWorkflowTool && nodeContentRef?.nodeTypeDescription"
					:node-type="nodeContentRef.nodeTypeDescription"
					:size="24"
					:circle="true"
					:class="$style.icon"
				/>
				<N8nIcon
					v-else-if="isWorkflowTool"
					icon="workflow"
					:size="20"
					:class="$style.workflowHeaderIcon"
				/>
				<N8nIcon v-else-if="isCustomTool" icon="code" :size="20" :class="$style.customHeaderIcon" />
				<N8nInlineTextEdit
					v-if="!isCustomTool"
					:model-value="nodeName"
					:max-width="400"
					:class="$style.title"
					@update:model-value="handleChangeName"
				/>
				<N8nText v-else :class="$style.title">
					{{ customToolTitle }}
				</N8nText>
			</div>
		</template>
		<template #content>
			<div
				:class="[
					$style.contentWrapper,
					(isCustomTool || activeView === 'raw') && $style.codeContentWrapper,
				]"
			>
				<AgentCustomToolViewer
					v-if="isCustomTool"
					:code="customToolCode"
					:class="$style.customToolViewer"
				/>
				<template v-else>
					<N8nRadioButtons
						:model-value="activeView"
						:options="viewOptions"
						:class="$style.viewToggle"
						@update:model-value="activeView = $event"
					/>
					<AgentJsonEditor
						v-show="activeView === 'raw'"
						:value="data.toolRef"
						read-only
						:show-read-only-overlay="false"
						:class="$style.rawEditor"
						copy-button-test-id="agent-tool-json-copy"
					/>
					<div v-show="activeView === 'config'" :class="$style.configureTab">
						<WorkflowToolConfigContent
							v-if="isWorkflowTool"
							ref="workflowContentRef"
							:initial-ref="data.toolRef"
							@update:valid="handleValidUpdate"
							@update:node-name="handleNodeNameUpdate"
						/>
						<NodeToolSettingsContent
							v-else-if="initialNode"
							ref="nodeContentRef"
							:initial-node="initialNode"
							:existing-tool-names="data.existingToolNames"
							:project-id="data.projectId"
							:hide-ask-assistant="true"
							@update:valid="handleValidUpdate"
							@update:node-name="handleNodeNameUpdate"
						/>
					</div>
				</template>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="data.onRemove"
					variant="subtle"
					data-test-id="agent-tool-config-remove"
					@click="handleRemove"
				>
					<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
					{{ i18n.baseText('agents.builder.tools.remove') }}
				</N8nButton>
				<div :class="$style.footerActions">
					<N8nButton variant="subtle" @click="handleCancel">
						{{
							isCustomTool
								? i18n.baseText('generic.close')
								: i18n.baseText('agents.toolConfig.cancel')
						}}
					</N8nButton>
					<N8nButton
						v-if="!isCustomTool"
						variant="solid"
						:disabled="!isValid"
						data-test-id="agent-tool-config-save"
						@click="handleConfirm"
					>
						{{ i18n.baseText('agents.toolConfig.save') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
	min-width: 0;
}

.icon {
	flex-shrink: 0;
	flex-grow: 0;
}

.workflowHeaderIcon {
	flex-shrink: 0;
	flex-grow: 0;
	color: var(--color--primary);
}

.customHeaderIcon {
	flex-shrink: 0;
	flex-grow: 0;
	color: var(--color--text--tint-1);
}

.title {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--lg);
	color: var(--color--text--shade-1);
	flex: 1;
	min-width: 0;
}

.footer {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-left: auto;
}

.contentWrapper {
	--agent-tool-config-content-max-height: min(
		calc(var(--spacing--5xl) * 2),
		calc(var(--dialog--max-height) - var(--spacing--5xl))
	);

	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: var(--agent-tool-config-content-max-height);
	overflow: hidden;
	margin-right: calc(-1 * var(--spacing--lg));
	padding: var(--spacing--md) 0;

	:global(.ndv-connection-hint-notice) {
		display: none;
	}
}

.codeContentWrapper {
	height: var(--agent-tool-config-content-max-height);
	margin-right: 0;
	padding-bottom: 0;
}

.configureTab {
	display: flex;
	flex: 1;
	min-height: 0;
	flex-direction: column;
}

.viewToggle {
	align-self: flex-start;
}

.rawEditor {
	flex: 1;
	width: 100%;
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}

.customToolViewer {
	flex: 1;
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}
</style>
