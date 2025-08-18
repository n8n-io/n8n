<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';
import NodeSettingsTabs from './NodeSettingsTabs.vue';
import NodeExecuteButton from './NodeExecuteButton.vue';
import type { NodeSettingsTab } from '@/types/nodeSettings';

type Props = {
	nodeName: string;
	hideExecute: boolean;
	hideTabs: boolean;
	disableExecute: boolean;
	executeButtonTooltip: string;
	selectedTab: NodeSettingsTab;
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
			hide-docs
			:model-value="selectedTab"
			:node-type="nodeType"
			:push-ref="pushRef"
			:class="$style.tabs"
			tabs-variant="modern"
			@update:model-value="emit('tab-changed', $event)"
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
</template>

<style lang="scss" module>
.header {
	--color-tabs-arrow-buttons: var(--color-background-xlight);

	display: flex;
	align-items: center;
	min-height: 40px;
	padding-right: var(--spacing-s);

	border-bottom: var(--border-base);
}

.tabs {
	align-self: flex-end;
}

.tabs :global(#communityNode) {
	padding-right: var(--spacing-2xs);
}
</style>
