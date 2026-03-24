<script lang="ts" setup>
import { ref, computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import { getRenderableAgentResult } from '../agentResult';
import AgentTimeline from './AgentTimeline.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const instanceAiStore = useInstanceAiStore();

function handleStop() {
	instanceAiStore.amendAgent(props.agentNode.agentId, props.agentNode.role, props.agentNode.taskId);
}

const i18n = useI18n();
const isDetailOpen = ref(false);

interface PhaseItem {
	key: string;
	label: string;
	detail: string;
	isLoading: boolean;
}

const searchItems = computed((): PhaseItem[] =>
	props.agentNode.toolCalls
		.filter((t) => t.toolName === 'web-search')
		.map((t, idx) => ({
			key: `search-${idx}`,
			label: t.isLoading
				? i18n.baseText('instanceAi.researchCard.phase.searching')
				: i18n.baseText('instanceAi.researchCard.phase.searched'),
			detail: typeof t.args.query === 'string' ? t.args.query : '',
			isLoading: t.isLoading,
		})),
);

const fetchItems = computed((): PhaseItem[] =>
	props.agentNode.toolCalls
		.filter((t) => t.toolName === 'fetch-url')
		.map((t, idx) => {
			const url = typeof t.args.url === 'string' ? t.args.url : '';
			let shortUrl = url;
			try {
				const parsed = new URL(url);
				shortUrl = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
			} catch {
				// keep raw url
			}
			return {
				key: `fetch-${idx}`,
				label: t.isLoading
					? i18n.baseText('instanceAi.researchCard.phase.reading')
					: i18n.baseText('instanceAi.researchCard.phase.read'),
				detail: shortUrl,
				isLoading: t.isLoading,
			};
		}),
);

const isActive = computed(() => props.agentNode.status === 'active');
const isError = computed(() => props.agentNode.status === 'error');
const isCompleted = computed(
	() => props.agentNode.status === 'completed' || props.agentNode.status === 'cancelled',
);
const displayResult = computed(() => getRenderableAgentResult(props.agentNode));

const allToolCallsDone = computed(
	() =>
		props.agentNode.toolCalls.length > 0 && props.agentNode.toolCalls.every((t) => !t.isLoading),
);

const isSynthesizing = computed(() => isActive.value && allToolCallsDone.value);

const allItems = computed(() => {
	const items: PhaseItem[] = [...searchItems.value, ...fetchItems.value];
	if (isSynthesizing.value) {
		items.push({
			key: 'synthesizing',
			label: i18n.baseText('instanceAi.researchCard.phase.analyzing'),
			detail: '',
			isLoading: true,
		});
	}
	return items;
});

const headerTitle = computed(() => {
	if (isSynthesizing.value) {
		return i18n.baseText('instanceAi.researchCard.title.analyzing');
	}
	return i18n.baseText('instanceAi.researchCard.title');
});
</script>

<template>
	<div :class="$style.root">
		<!-- Header -->
		<div :class="$style.header">
			<div :class="$style.headerLeft">
				<N8nIcon v-if="isActive" icon="spinner" spin size="small" :class="$style.activeIcon" />
				<N8nIcon v-else-if="isError" icon="triangle-alert" size="small" :class="$style.errorIcon" />
				<N8nIcon v-else icon="check" size="small" :class="$style.successIcon" />
				<span :class="$style.title">{{ headerTitle }}</span>
			</div>
			<button v-if="isActive" :class="$style.stopButton" @click="handleStop">
				<N8nIcon icon="square" size="small" />
				{{ i18n.baseText('instanceAi.agent.stop') }}
			</button>
		</div>

		<!-- Checklist -->
		<div v-if="allItems.length > 0" :class="$style.checklist">
			<div
				v-for="item in allItems"
				:key="item.key"
				:class="[$style.checkItem, item.isLoading ? $style.checkItemActive : $style.checkItemDone]"
			>
				<N8nIcon v-if="item.isLoading" icon="spinner" spin size="small" :class="$style.checkIcon" />
				<N8nIcon v-else icon="check" size="small" :class="$style.checkIconDone" />
				<span :class="$style.checkLabel">{{ item.label }}</span>
				<span v-if="item.detail" :class="$style.checkDetail">{{ item.detail }}</span>
			</div>
		</div>

		<!-- Expandable detail -->
		<CollapsibleRoot
			v-if="props.agentNode.toolCalls.length > 0"
			v-model:open="isDetailOpen"
			:class="$style.detailBlock"
		>
			<CollapsibleTrigger :class="$style.detailTrigger">
				<span>{{ i18n.baseText('instanceAi.researchCard.details') }}</span>
				<N8nIcon :icon="isDetailOpen ? 'chevron-up' : 'chevron-down'" size="small" />
			</CollapsibleTrigger>
			<CollapsibleContent :class="$style.detailContent">
				<AgentTimeline :agent-node="props.agentNode" :compact="true" />
			</CollapsibleContent>
		</CollapsibleRoot>

		<!-- Completion -->
		<div v-if="isCompleted && !isError" :class="$style.successResult">
			<N8nIcon icon="check" size="small" :class="$style.successIcon" />
			<span>{{ i18n.baseText('instanceAi.researchCard.complete') }}</span>
		</div>

		<div v-if="displayResult && !props.agentNode.error" :class="$style.resultBlock">
			<InstanceAiMarkdown :content="displayResult" />
		</div>

		<!-- Error -->
		<div v-if="props.agentNode.error" :class="$style.errorResult">
			<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
			<span>{{ props.agentNode.error }}</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
}

.title {
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.checklist {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--xs) var(--spacing--2xs);
}

.checkItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	min-width: 0;
}

.checkItemActive {
	color: var(--color--text--tint-1);
}

.checkItemDone {
	color: var(--color--success);
}

.checkIcon {
	flex-shrink: 0;
	color: var(--color--primary);
}

.checkIconDone {
	flex-shrink: 0;
	color: var(--color--success);
}

.checkLabel {
	flex-shrink: 0;
	font-weight: var(--font-weight--bold);
}

.checkDetail {
	font-weight: var(--font-weight--regular);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	opacity: 0.8;
}

.detailBlock {
	border-top: var(--border);
}

.detailTrigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--xs);
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.detailContent {
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.successResult {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border-top: var(--border);
	background: color-mix(in srgb, var(--color--success) 10%, var(--color--background));
	font-size: var(--font-size--2xs);
	color: var(--color--success);
}

.resultBlock {
	padding: var(--spacing--xs);
	border-top: var(--border);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.errorResult {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border-top: var(--border);
	background: color-mix(in srgb, var(--color--danger) 10%, var(--color--background));
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
}

.stopButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	font-family: var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--danger);
	background: color-mix(in srgb, var(--color--danger) 10%, var(--color--background));
	border: var(--border-width) var(--border-style) var(--color--danger);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: color-mix(in srgb, var(--color--danger) 18%, var(--color--background));
	}
}

.activeIcon {
	color: var(--color--primary);
}

.successIcon {
	color: var(--color--success);
}

.errorIcon {
	color: var(--color--danger);
}
</style>
