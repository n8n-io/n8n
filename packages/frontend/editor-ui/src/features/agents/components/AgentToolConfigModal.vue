<script setup lang="ts">
/**
 * Configure a single tool (node or workflow) on an agent.
 *
 * Takes an `AgentJsonToolRef` (the persisted shape from `@n8n/api-types`) and
 * renders the appropriate form:
 *   - `type: 'node'`   → shared `NodeToolSettingsContent` (NDV-style param form)
 *   - `type: 'workflow'` → small `WorkflowToolConfigContent` (description +
 *                          allOutputs toggle)
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
import { N8nButton, N8nIcon, N8nInlineTextEdit } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode } from 'n8n-workflow';

import type { AgentJsonToolRef } from '../types';
import {
	toolRefToNode,
	updateToolRefFromNode,
	updateWorkflowToolRef,
} from '../composables/useAgentToolRefAdapter';

const props = defineProps<{
	modalName: string;
	data: {
		toolRef: AgentJsonToolRef;
		existingToolNames?: string[];
		onConfirm: (updatedRef: AgentJsonToolRef) => void;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const isWorkflowTool = computed(() => props.data.toolRef.type === 'workflow');

const nodeContentRef = ref<InstanceType<typeof NodeToolSettingsContent> | null>(null);
const workflowContentRef = ref<InstanceType<typeof WorkflowToolConfigContent> | null>(null);
const isValid = ref(false);

/** Derive an INode view of a node-type ref once. Null for workflow refs. */
const initialNode = computed<INode | null>(() =>
	isWorkflowTool.value ? null : toolRefToNode(props.data.toolRef),
);
const initialName = computed(() => props.data.toolRef.name ?? initialNode.value?.name ?? '');
const nodeName = ref(initialName.value);

/** Gate the modal render — for node tools we need a resolvable node; workflow
 *  tools always render since their data is self-contained in the ref. */
const canRender = computed(() => isWorkflowTool.value || initialNode.value !== null);

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function handleConfirm() {
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

function handleChangeName(name: string) {
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
	<Modal v-if="canRender" :name="modalName" width="780px" data-test-id="agent-tool-config-modal">
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
				<N8nInlineTextEdit
					:model-value="nodeName"
					:max-width="400"
					:class="$style.title"
					@update:model-value="handleChangeName"
				/>
			</div>
		</template>
		<template #content>
			<div :class="$style.contentWrapper">
				<div :class="$style.configureTab">
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
						@update:valid="handleValidUpdate"
						@update:node-name="handleNodeNameUpdate"
					/>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="handleCancel">
					{{ i18n.baseText('agents.toolConfig.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					:disabled="!isValid"
					data-test-id="agent-tool-config-save"
					@click="handleConfirm"
				>
					{{ i18n.baseText('agents.toolConfig.save') }}
				</N8nButton>
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
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.contentWrapper {
	display: flex;
	flex-direction: column;
	max-height: 80vh;
	overflow: hidden;
	margin-right: calc(-1 * var(--spacing--lg));
	padding: var(--spacing--md) 0;

	:global(.ndv-connection-hint-notice) {
		display: none;
	}
}

.configureTab {
	display: flex;
	flex: 1;
	min-height: 0;
	flex-direction: column;
}
</style>
