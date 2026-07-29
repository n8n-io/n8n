<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import DiffBadge from '@/features/workflows/workflowDiff/DiffBadge.vue';
import type { NodeChangeEntry } from '@/features/ai/assistant/composables/useReviewChanges';

defineProps<{
	nodeChanges: NodeChangeEntry[];
	expanded: boolean;
}>();

const emit = defineEmits<{
	toggle: [];
	openDiff: [];
	selectNode: [nodeId: string];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container" data-test-id="review-changes-banner">
		<div
			:class="$style.header"
			role="button"
			tabindex="0"
			@click="emit('toggle')"
			@keydown.enter="emit('toggle')"
		>
			<div :class="$style.headerLeft">
				<N8nIcon
					icon="chevron-right"
					size="small"
					:class="[$style.chevron, expanded && $style.chevronExpanded]"
				/>
				<span :class="$style.label">
					{{
						i18n.baseText('aiAssistant.builder.reviewChanges.editsCount', {
							interpolate: { count: String(nodeChanges.length) },
						})
					}}
				</span>
			</div>
			<N8nButton size="xsmall" variant="ghost" @click.stop="emit('openDiff')">
				{{ i18n.baseText('aiAssistant.builder.reviewChanges.openDiff') }}
				<N8nIcon icon="arrow-up-right" size="xsmall" />
			</N8nButton>
		</div>
		<div :class="[$style.body, expanded && $style.bodyExpanded]">
			<ul :class="$style.nodeList">
				<li
					v-for="change in nodeChanges"
					:key="change.node.id"
					:class="$style.nodeItem"
					role="button"
					tabindex="0"
					@click="emit('selectNode', change.node.id)"
					@keydown.enter="emit('selectNode', change.node.id)"
				>
					<DiffBadge :type="change.status" />
					<NodeIcon
						v-if="change.nodeType"
						:node-type="change.nodeType"
						:size="16"
						:class="$style.nodeIcon"
					/>
					<span :class="$style.nodeName">{{ change.node.name }}</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-bottom: none;
	border-radius: var(--radius) var(--radius) 0 0;
	margin: 0 var(--spacing--2xs);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--3xs) var(--spacing--2xs);
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-1);
	}
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.chevron {
	transition: transform 0.2s ease;
	color: var(--color--text--shade-1);
	flex-shrink: 0;
}

.chevronExpanded {
	transform: rotate(90deg);
}

.label {
	font-size: var(--font-size--xs);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--regular);
}

.body {
	max-height: 0;
	overflow: hidden;
	transition: max-height 0.2s ease;
}

.bodyExpanded {
	max-height: 200px;
	overflow-y: auto;
}

.nodeList {
	list-style: none;
	margin: 0;
	padding: 0 var(--spacing--4xs) var(--spacing--2xs);
}

.nodeItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--4xs);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-1);
	}
}

.nodeIcon {
	flex-shrink: 0;
}

.nodeName {
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	min-width: 0;
}
</style>
