<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import NodeSettingsTabs from '@/components/NodeSettingsTabs.vue';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import type { NodeSettingsTab } from '@/types/nodeSettings';

import { N8nInlineTextEdit, N8nText } from '@n8n/design-system';
defineProps<{
	node: INode;
	readOnly: boolean;
	nodeType?: INodeTypeDescription | null;
	pushRef: string;
	subTitle?: string;
	extraTabsClassName?: string;
	selectedTab: NodeSettingsTab;
	includeAction: boolean;
	includeCredential: boolean;
	hasCredentialIssue?: boolean;
}>();

const emit = defineEmits<{
	'name-changed': [value: string];
	'dblclick-title': [event: MouseEvent];
	'tab-changed': [tab: NodeSettingsTab];
}>();

defineSlots<{ actions?: {} }>();
</script>

<template>
	<div :class="[$style.component, node.disabled ? $style.disabled : '']">
		<div :class="$style.title" @dblclick="emit('dblclick-title', $event)">
			<NodeIcon :node-type="nodeType" :size="16" />
			<div :class="$style.titleText">
				<N8nInlineTextEdit
					:min-width="0"
					:model-value="node.name"
					:read-only="readOnly"
					@update:model-value="emit('name-changed', $event)"
				/>
			</div>
			<N8nText bold size="small" color="text-light" :class="$style.subTitleText">
				{{ subTitle }}
			</N8nText>
			<slot name="actions" />
		</div>
		<div :class="$style.tabsContainer">
			<NodeSettingsTabs
				:class="extraTabsClassName"
				:model-value="selectedTab"
				:node-type="nodeType"
				:push-ref="pushRef"
				tabs-variant="modern"
				compact
				:include-action="includeAction"
				:include-credential="includeCredential"
				:has-credential-issue="hasCredentialIssue"
				@update:model-value="emit('tab-changed', $event)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.component {
	border-bottom: var(--border);
}

.title {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--3xs) var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
	gap: var(--spacing--4xs);
	cursor: grab;

	.disabled & {
		background-color: var(--color--foreground--tint-1);
	}
}

.titleText {
	min-width: 0;
	flex-grow: 1;
	flex-shrink: 1;
	font-weight: var(--font-weight--medium);
	font-size: var(--font-size--sm);
	overflow: hidden;

	/* Same amount of padding and negative margin for border to not be cut by overflow: hidden */
	padding: var(--spacing--2xs);
	margin: calc(-1 * var(--spacing--2xs));
}

.subTitleText {
	width: 0;
	flex-grow: 100;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	padding-top: var(--spacing--5xs);
}

.tabsContainer {
	padding-top: var(--spacing--xs);
	padding-inline: var(--spacing--xs);
}
</style>
