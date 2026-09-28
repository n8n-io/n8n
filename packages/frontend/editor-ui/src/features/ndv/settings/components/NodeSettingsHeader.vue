<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton } from '@n8n/design-system';
import type { INodeTypeDescription } from 'n8n-workflow';
import NodeSettingsTabs from './NodeSettingsTabs.vue';
import NodeExecuteButton from '@/app/components/NodeExecuteButton.vue';
import type { NodeSettingsTab } from '@/app/types/nodeSettings';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeExecution } from '@/app/composables/useNodeExecution';

type Props = {
	nodeName: string;
	hideExecute: boolean;
	hideDocs: boolean;
	hideTabs: boolean;
	disableExecute: boolean;
	executeButtonTooltip: string;
	selectedTab: NodeSettingsTab;
	nodeType?: INodeTypeDescription | null;
	pushRef: string;
};

const props = defineProps<Props>();

const i18n = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
const node = computed(() => workflowDocumentStore.value.getNodeByName(props.nodeName) ?? null);
const { isExecuting, stopExecution } = useNodeExecution(node);

const emit = defineEmits<{
	execute: [];
	'stop-execution': [];
	'tab-changed': [tab: NodeSettingsTab];
}>();
</script>

<template>
	<div :class="$style.header">
		<NodeSettingsTabs
			v-if="!hideTabs"
			:hide-docs="hideDocs"
			:model-value="selectedTab"
			:node-type="nodeType"
			:push-ref="pushRef"
			:class="$style.tabs"
			@update:model-value="emit('tab-changed', $event)"
		/>
		<N8nIconButton
			v-if="!hideExecute && isExecuting"
			data-test-id="ndv-stop-execution-button"
			variant="subtle"
			icon="square"
			size="small"
			:class="$style.stop"
			:title="i18n.baseText('nodeView.stopCurrentExecution')"
			@click="stopExecution"
		/>
		<NodeExecuteButton
			v-if="!hideExecute"
			data-test-id="node-execute-button"
			:node-name="nodeName"
			:disabled="disableExecute"
			:tooltip="executeButtonTooltip"
			:class="$style.execute"
			size="small"
			telemetry-source="parameters"
			@execute="emit('execute')"
			@stop-execution="emit('stop-execution')"
		/>
	</div>
</template>

<style lang="scss" module>
.header {
	--tabs--arrow-buttons--color: var(--color--background--light-3);

	display: flex;
	align-items: center;
	height: var(--ndv--header--height);
	flex-shrink: 0;
	border-bottom: var(--border);
	padding-right: var(--spacing--2xs);
}

.tabs {
	align-self: flex-end;
}

.tabs :global(#communityNode) {
	padding-right: var(--spacing--2xs);
}

.stop {
	margin-right: var(--spacing--2xs);
}
</style>
