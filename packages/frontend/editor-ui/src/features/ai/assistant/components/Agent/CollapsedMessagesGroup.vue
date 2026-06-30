<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import { isToolMessage, isThinkingGroupMessage } from '@n8n/design-system/types/assistant';
import type { NodeChangeEntry } from '@/features/ai/assistant/composables/useReviewChanges';
import { N8nIcon, MessageWrapper, ThinkingMessage } from '@n8n/design-system';
import { isVersionCardMessage, type VersionCardMessage } from '../../assistant.types';
import ChatVersionCard from './ChatVersionCard.vue';

function asVersionCard(msg: ChatUI.AssistantMessage): VersionCardMessage {
	return msg as VersionCardMessage;
}

const props = defineProps<{
	messages: ChatUI.AssistantMessage[];
	versionNodeChangesMap: Map<string, NodeChangeEntry[]>;
	getVersionIndex: (message: ChatUI.AssistantMessage) => number;
}>();

const emit = defineEmits<{
	'open-diff': [versionId: string];
	restore: [versionId: string, versionCardId: string];
	'show-in-history': [versionId: string];
	'select-node': [nodeId: string];
}>();

const i18n = useI18n();
const isExpanded = ref(false);

const versionCount = computed(
	() =>
		props.messages.filter(
			(msg) =>
				isVersionCardMessage(msg) &&
				(props.versionNodeChangesMap.get(msg.data.versionId) ?? []).length > 0,
		).length,
);

/**
 * Group consecutive tool messages into ThinkingGroup messages,
 * matching the same pattern used by AskAssistantChat.vue.
 * Non-tool messages pass through unchanged.
 */
const groupedMessages = computed<ChatUI.AssistantMessage[]>(() => {
	const result: ChatUI.AssistantMessage[] = [];
	let i = 0;

	while (i < props.messages.length) {
		const msg = props.messages[i];

		if (!isToolMessage(msg)) {
			// Skip workflow-updated messages (same as main chat)
			if (msg.type !== 'workflow-updated') {
				result.push(msg);
			}
			i++;
			continue;
		}

		// Collect consecutive tool messages
		const toolGroup: ChatUI.ToolMessage[] = [msg];
		let j = i + 1;
		while (j < props.messages.length) {
			const next = props.messages[j];
			if (!isToolMessage(next) && next.type !== 'workflow-updated') break;
			if (isToolMessage(next)) toolGroup.push(next);
			j++;
		}

		// Dedupe by toolName, keeping latest status
		const uniqueMap = new Map<string, ChatUI.ToolMessage>();
		for (const tool of toolGroup) {
			uniqueMap.set(tool.toolName, tool);
		}

		const items: ChatUI.ThinkingItem[] = Array.from(uniqueMap.values()).map((m) => ({
			id: `tool-${m.toolName}`,
			displayTitle:
				m.customDisplayTitle ||
				m.displayTitle ||
				m.toolName
					.split('_')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' '),
			status: m.status,
		}));

		const thinkingGroup: ChatUI.ThinkingGroupMessage = {
			id: `thinking-group-collapsed-${i}`,
			role: 'assistant',
			type: 'thinking-group',
			items,
			latestStatusText: i18n.baseText('aiAssistant.builder.collapsedMessages.thinking'),
		};

		result.push(thinkingGroup);
		i = j;
	}

	return result;
});

function isNonEmptyVersionCard(msg: ChatUI.AssistantMessage): boolean {
	return (
		isVersionCardMessage(msg) &&
		(props.versionNodeChangesMap.get(msg.data.versionId) ?? []).length > 0
	);
}

function isCustomMessage(msg: ChatUI.AssistantMessage): boolean {
	return msg.type === 'custom';
}

function toggleExpanded() {
	isExpanded.value = !isExpanded.value;
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.collapsedHeader" :aria-expanded="isExpanded" @click="toggleExpanded">
			<div :class="$style.dividerLine" />
			<button :class="$style.toggleButton" type="button">
				<span :class="$style.count">
					{{
						i18n.baseText('aiAssistant.builder.collapsedMessages.count', {
							interpolate: { count: String(versionCount) },
						})
					}}
				</span>
				<N8nIcon :icon="isExpanded ? 'chevron-up' : 'chevron-down'" size="small" />
			</button>
			<div :class="$style.dividerLine" />
		</div>

		<p :class="$style.notVisibleNote">
			{{ i18n.baseText('aiAssistant.builder.collapsedMessages.notVisibleToAI') }}
		</p>

		<div v-if="isExpanded" :class="$style.expandedMessages">
			<template v-for="(msg, idx) in groupedMessages" :key="msg.id">
				<!-- Version cards (custom messages) -->
				<ChatVersionCard
					v-if="isNonEmptyVersionCard(msg)"
					:version-id="asVersionCard(msg).data.versionId"
					:is-current="false"
					:node-changes="versionNodeChangesMap.get(asVersionCard(msg).data.versionId) ?? []"
					:title="asVersionCard(msg).data.title"
					:version-index="getVersionIndex(msg)"
					:version-exists="!!asVersionCard(msg).data.createdAt"
					@open-diff="(versionId) => emit('open-diff', versionId)"
					@restore="(versionId) => emit('restore', versionId, msg.id!)"
					@show-in-history="emit('show-in-history', $event)"
					@select-node="emit('select-node', $event)"
				/>

				<!-- Thinking groups (collapsed tool messages) -->
				<ThinkingMessage
					v-else-if="isThinkingGroupMessage(msg)"
					:items="msg.items"
					:default-expanded="false"
					:latest-status-text="msg.latestStatusText"
					:is-streaming="false"
				/>

				<!-- Standard messages (text, block, code-diff, error, etc.) -->
				<MessageWrapper
					v-else-if="!isCustomMessage(msg)"
					:message="msg"
					:is-first-of-role="idx === 0 || msg.role !== groupedMessages[idx - 1].role"
					:streaming="false"
					:is-last-message="false"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing--2xs) 0;
}

.collapsedHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
}

.dividerLine {
	flex: 1;
	height: 1px;
	background-color: var(--color--foreground);
}

.toggleButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	background: none;
	border: none;
	cursor: pointer;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	white-space: nowrap;

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}

.count {
	font-weight: var(--font-weight--bold);
}

.notVisibleNote {
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	margin: var(--spacing--4xs) 0 0;
}

.expandedMessages {
	margin-top: var(--spacing--xs);
	padding-left: var(--spacing--xs);
	border-left: var(--spacing--5xs) var(--border-style) var(--color--foreground);
	opacity: 0.65;
}
</style>
