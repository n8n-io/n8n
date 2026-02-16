<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useUIStore } from '@/app/stores/ui.store';
import {
	N8nButton,
	N8nDialog,
	N8nDialogClose,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInlineTextEdit,
} from '@n8n/design-system';
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
	<N8nDialog v-if="data.node" :open="true" size="2xlarge" @update:open="closeDialog">
		<N8nDialogHeader>
			<div :class="$style.header">
				<NodeIcon
					v-if="contentRef?.nodeTypeDescription"
					:node-type="contentRef.nodeTypeDescription"
					:size="24"
					:circle="true"
					:class="$style.icon"
				/>
				<N8nDialogTitle as-child>
					<N8nInlineTextEdit
						:model-value="nodeName"
						:max-width="400"
						:class="$style.title"
						@update:model-value="handleChangeName"
					/>
				</N8nDialogTitle>
			</div>
		</N8nDialogHeader>
		<div data-tool-settings-content :class="$style.contentWrapper">
			<ToolSettingsContent
				ref="contentRef"
				:initial-node="data.node"
				:existing-tool-names="data.existingToolNames"
				@update:valid="handleValidUpdate"
				@update:node-name="handleNodeNameUpdate"
			/>
		</div>
		<N8nDialogFooter>
			<N8nDialogClose as-child>
				<N8nButton variant="subtle" @click="handleCancel">
					{{ i18n.baseText('chatHub.toolSettings.cancel') }}
				</N8nButton>
			</N8nDialogClose>
			<N8nButton variant="solid" :disabled="!isValid" @click="handleConfirm">
				{{ i18n.baseText('chatHub.toolSettings.confirm') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
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

<style lang="scss">
[role='dialog']:has([data-tool-settings-content]) {
	background-color: var(--dialog--color--background);
}
</style>
