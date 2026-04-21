<script setup lang="ts">
/**
 * Configure a single node-type tool on an agent.
 *
 * Takes an `AgentJsonToolRef` (the persisted shape from `@n8n/api-types`),
 * converts it to an `INode` via `toolRefToNode`, and hands the node to the
 * shared `NodeToolSettingsContent` (same form Chat Hub uses). On Save, the
 * edited node is merged back into the ref via `updateToolRefFromNode` so
 * round-trip fields like `inputSchema` and `description` are preserved.
 *
 * Outer tabs: Configure (the shared form) and Permissions (stubbed — the
 * scope/permissions registry is deferred per AGENT-26 spec). The tab slot is
 * reserved now to avoid UI churn when the Permissions feature lands.
 */
import { computed, ref } from 'vue';
import Modal from '@/app/components/Modal.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import NodeToolSettingsContent from '@/features/shared/toolConfig/NodeToolSettingsContent.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nButton, N8nInlineTextEdit, N8nTabs, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ITab } from '@/Interface';
import type { INode } from 'n8n-workflow';

import type { AgentJsonToolRef } from '../types';
import { toolRefToNode, updateToolRefFromNode } from '../composables/useAgentToolRefAdapter';

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

const contentRef = ref<InstanceType<typeof NodeToolSettingsContent> | null>(null);
const isValid = ref(false);

/** Derive an INode view of the ref once. Memoized by toolRef identity. */
const initialNode = computed<INode | null>(() => toolRefToNode(props.data.toolRef));
const nodeName = ref(initialNode.value?.name ?? '');

type ConfigTab = 'configure' | 'permissions';
const activeTab = ref<ConfigTab>('configure');

const tabOptions = computed<Array<ITab<ConfigTab>>>(() => [
	{ label: i18n.baseText('agents.toolConfig.tabs.configure'), value: 'configure' },
	{ label: i18n.baseText('agents.toolConfig.tabs.permissions'), value: 'permissions' },
]);

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function handleConfirm() {
	const currentNode = contentRef.value?.node;
	if (!currentNode) {
		return;
	}
	const updatedRef = updateToolRefFromNode(props.data.toolRef, currentNode);
	props.data.onConfirm(updatedRef);
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
	<Modal v-if="initialNode" :name="modalName" width="780px" data-test-id="agent-tool-config-modal">
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
				<N8nTabs
					:model-value="activeTab"
					:options="tabOptions"
					:class="$style.tabs"
					@update:model-value="activeTab = $event"
				/>

				<div v-show="activeTab === 'configure'" :class="$style.configureTab">
					<NodeToolSettingsContent
						ref="contentRef"
						:initial-node="initialNode"
						:existing-tool-names="data.existingToolNames"
						@update:valid="handleValidUpdate"
						@update:node-name="handleNodeNameUpdate"
					/>
				</div>

				<div
					v-show="activeTab === 'permissions'"
					:class="$style.permissionsTab"
					data-test-id="agent-tool-config-permissions-tab"
				>
					<N8nText color="text-light">
						{{ i18n.baseText('agents.toolConfig.permissions.comingSoon') }}
					</N8nText>
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

.tabs {
	flex-shrink: 0;
	margin-bottom: var(--spacing--sm);
	padding-right: var(--spacing--lg);
}

.configureTab {
	display: flex;
	flex: 1;
	min-height: 0;
	flex-direction: column;
}

.permissionsTab {
	padding: var(--spacing--md) var(--spacing--lg) var(--spacing--md) 0;
}
</style>
