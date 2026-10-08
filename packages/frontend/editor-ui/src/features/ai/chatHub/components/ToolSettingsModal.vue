<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useUIStore } from '@/app/stores/ui.store';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInlineTextEdit,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode } from 'n8n-workflow';
import { computed, ref } from 'vue';
import NodeToolSettingsContent from '@/features/shared/toolConfig/NodeToolSettingsContent.vue';

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
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const contentRef = ref<InstanceType<typeof NodeToolSettingsContent> | null>(null);
const isValid = ref(false);
const nodeName = ref(props.data.node?.name ?? '');

async function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
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
	<N8nDialog v-if="data.node" :open="modalOpen" size="2xlarge" @update:open="onDialogOpenUpdate">
		<N8nDialogHeader>
			<div :class="$style.header">
				<NodeIcon
					v-if="contentRef?.nodeTypeDescription"
					:node-type="contentRef.nodeTypeDescription"
					:size="24"
					:circle="true"
					:class="$style.icon"
				/>
				<N8nDialogTitle>
					<N8nInlineTextEdit
						:model-value="nodeName"
						:max-width="400"
						:class="$style.title"
						@update:model-value="handleChangeName"
					/>
				</N8nDialogTitle>
			</div>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.contentWrapper">
				<NodeToolSettingsContent
					ref="contentRef"
					:initial-node="data.node"
					:existing-tool-names="data.existingToolNames"
					@update:valid="handleValidUpdate"
					@update:node-name="handleNodeNameUpdate"
				/>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="handleCancel">
					{{ i18n.baseText('chatHub.toolSettings.cancel') }}
				</N8nButton>
				<N8nButton variant="solid" :disabled="!isValid" @click="handleConfirm">
					{{ i18n.baseText('chatHub.toolSettings.confirm') }}
				</N8nButton>
			</div>
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
