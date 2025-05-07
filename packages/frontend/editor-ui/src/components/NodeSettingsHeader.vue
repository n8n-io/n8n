<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';
import { type Tab, default as NodeSettingsTabs } from './NodeSettingsTabs.vue';
import NodeExecuteButton from './NodeExecuteButton.vue';

type Props = {
	nodeName: string;
	hideExecute: boolean;
	hideTabs: boolean;
	disableExecute: boolean;
	executeButtonTooltip: string;
	selectedTab: Tab;
	nodeType?: INodeTypeDescription | null;
	pushRef: string;
};

defineProps<Props>();

const emit = defineEmits<{
	execute: [];
	'stop-execution': [];
	'value-changed': [update: IUpdateInformation];
	'tab-changed': [tab: Tab];
}>();
</script>

<template>
	<div :class="$style.header">
		<NodeSettingsTabs
			v-if="!hideTabs"
			:model-value="selectedTab"
			:node-type="nodeType"
			:push-ref="pushRef"
			:class="$style.tabs"
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
	--spacing-bottom-tab: calc(var(--spacing-s) - 2px);
	--font-size-tab: var(--font-size-2xs);
	--color-tabs-arrow-buttons: var(--color-background-xlight);
	--font-weight-tab: var(--font-weight-bold);

	display: flex;
	align-items: center;
	height: 40px;
	padding-right: var(--spacing-s);
	padding-top: var(--spacing-2xs);
	border-bottom: var(--border-base);
}

.tabs {
	margin-top: var(--spacing-5xs);
}

.execute {
	margin-bottom: var(--spacing-2xs);
}
</style>
