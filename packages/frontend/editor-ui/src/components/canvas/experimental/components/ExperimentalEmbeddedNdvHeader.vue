<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import NodeSettingsTabs, { type Tab } from '@/components/NodeSettingsTabs.vue';
import { N8nText } from '@n8n/design-system';
import type { INode, INodeTypeDescription } from 'n8n-workflow';

defineProps<{
	node: INode;
	readOnly: boolean;
	nodeType?: INodeTypeDescription | null;
	pushRef: string;
	subTitle?: string;
	selectedTab: Tab;
}>();

const emit = defineEmits<{
	'name-changed': [value: string];
	'tab-changed': [tab: Tab];
}>();

defineSlots<{ actions?: {} }>();
</script>

<template>
	<div :class="[$style.component, node.disabled ? $style.disabled : '']">
		<div :class="$style.title">
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
		<NodeSettingsTabs
			:model-value="selectedTab"
			:node-type="nodeType"
			:push-ref="pushRef"
			tabs-variant="modern"
			@update:model-value="emit('tab-changed', $event)"
		/>
	</div>
</template>

<style lang="scss" module>
.component {
	border-bottom: var(--border-base);
}

.title {
	display: flex;
	align-items: center;
	padding: var(--spacing-2xs) var(--spacing-3xs) var(--spacing-2xs) var(--spacing-xs);
	border-bottom: var(--border-base);
	margin-bottom: var(--spacing-xs);
	gap: var(--spacing-4xs);

	.disabled & {
		background-color: var(--color-foreground-light);
	}
}

.titleText {
	min-width: 0;
	flex-grow: 1;
	flex-shrink: 1;
	font-weight: var(--font-weight-medium);
	font-size: var(--font-size-s);
	overflow: hidden;

	/* Same amount of padding and negative margin for border to not be cut by overflow: hidden */
	padding: var(--spacing-2xs);
	margin: calc(-1 * var(--spacing-2xs));
}

.subTitleText {
	width: 0;
	flex-grow: 100;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	padding-top: var(--spacing-5xs);
}
</style>
