<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';
import NodeSettingsTabs from './NodeSettingsTabs.vue';
import NodeExecuteButton from './NodeExecuteButton.vue';
import NodeUpdateVersionButton from '@/components/NodeUpdateVersionButton.vue';
import type { NodeSettingsTab } from '@/types/nodeSettings';

type Props = {
	nodeName: string;
	hideExecute: boolean;
	hideDocs: boolean;
	hideTabs: boolean;
	disableExecute: boolean;
	executeButtonTooltip: string;
	selectedTab: NodeSettingsTab;
	isLatestNodeVersion: boolean;
	nodeType?: INodeTypeDescription | null;
	pushRef: string;
};

defineProps<Props>();

const emit = defineEmits<{
	execute: [];
	'stop-execution': [];
	'value-changed': [update: IUpdateInformation];
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
			tabs-variant="modern"
			@update:model-value="emit('tab-changed', $event)"
		/>
		<div :class="$style.update">
			<NodeUpdateVersionButton
				v-if="!hideExecute && !isLatestNodeVersion"
				type="warning"
				size="small"
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
				@value-changed="emit('value-changed', $event)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.header {
	--color-tabs-arrow-buttons: var(--color-background-xlight);

	display: flex;
	align-items: center;
	min-height: 40px;

	border-bottom: var(--border-base);
}

.execute {
	margin-right: var(--spacing-s);
}

.tabs {
	align-self: flex-end;
}

.tabs :global(#communityNode) {
	padding-right: var(--spacing-2xs);
}

.update {
	display: flex;
	flex-direction: row;
	gap: var(--spacing-xs);
}
</style>
