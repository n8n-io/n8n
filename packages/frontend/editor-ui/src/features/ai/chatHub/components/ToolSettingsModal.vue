<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nButton, N8nInlineTextEdit } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode } from 'n8n-workflow';
import { ref } from 'vue';
import ToolSettingsContent from './ToolSettingsContent.vue';

const props = defineProps<{
	modalName: string;
	data: {
		node: INode | null;
		existingToolNames?: string[];
		onConfirm: (configuredNode: INode) => void;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const contentRef = ref<InstanceType<typeof ToolSettingsContent> | null>(null);
const isValid = ref(false);
const nodeName = ref(props.data.node?.name ?? '');

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function handleConfirm() {
	const currentNode = contentRef.value?.node;
	if (!currentNode) {
		return;
	}

	props.data.onConfirm(currentNode);
	closeDialog();
}

function handleCancel() {
	closeDialog();
}

function handleChangeName(name: string) {
	contentRef.value?.handleChangeName(name);
}

function handleValidUpdate(valid: boolean) {
	isValid.value = valid;
}

function handleNodeNameUpdate(name: string) {
	nodeName.value = name;
}
</script>

<template>
	<Modal v-if="data.node" :name="modalName" width="780px">
		<template #header>
			<div :class="$style.header">
				<NodeIcon
					v-if="contentRef?.nodeTypeDescription"
					:node-type="contentRef.nodeTypeDescription"
					:size="24"
					:circle="true"
					:class="$style.icon"
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
				<ToolSettingsContent
					ref="contentRef"
					:initial-node="data.node"
					:existing-tool-names="data.existingToolNames"
					@update:valid="handleValidUpdate"
					@update:node-name="handleNodeNameUpdate"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="handleCancel">
					{{ i18n.baseText('chatHub.toolSettings.cancel') }}
				</N8nButton>
				<N8nButton variant="solid" :disabled="!isValid" @click="handleConfirm">
					{{ i18n.baseText('chatHub.toolSettings.confirm') }}
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
</style>
