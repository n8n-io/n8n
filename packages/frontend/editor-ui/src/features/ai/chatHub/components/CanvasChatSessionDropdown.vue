<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nDropdownMenu, N8nIcon, N8nText, type DropdownMenuItemProps } from '@n8n/design-system';
import type { ChatHubSessionDto, ChatSessionId } from '@n8n/api-types';
import { PopOutWindowKey } from '@n8n/composables/injectionKeys';
import { useChatStore } from '../chat.store';
import { groupConversationsByDate } from '../chat.utils';

const props = defineProps<{
	sessionId: ChatSessionId;
	sessionTitle: string;
	workflowId: string;
}>();

const emit = defineEmits<{
	'select-session': [sessionId: ChatSessionId];
}>();

const i18n = useI18n();
const chatStore = useChatStore();
const popOutWindow = inject(PopOutWindowKey, ref<Window | undefined>());
const isInPopOut = computed(() => !!popOutWindow.value);
const portalTarget = computed(() => popOutWindow.value?.document.body);

const isOpen = ref(false);
const isLoading = ref(false);
const hasFetchedForWorkflow = ref(false);

const workflowSessions = computed(() => {
	const ids = chatStore.sessions.ids ?? [];
	return ids.reduce<ChatHubSessionDto[]>((acc, id) => {
		const s = chatStore.sessions.byId[id];
		if (s?.workflowId === props.workflowId && s.type === 'manual') {
			acc.push(s);
		}
		return acc;
	}, []);
});

const menuItems = computed<Array<DropdownMenuItemProps<string>>>(() => {
	if (isLoading.value) return [];

	const grouped = groupConversationsByDate(workflowSessions.value);
	const items: Array<DropdownMenuItemProps<string>> = [];

	for (let i = 0; i < grouped.length; i++) {
		const group = grouped[i];
		items.push({
			id: `__group-${i}__`,
			label: group.group,
			header: true,
		});
		for (const session of group.sessions) {
			items.push({
				id: session.id,
				label: session.id,
				checked: session.id === props.sessionId,
			});
		}
	}

	return items;
});

async function handleOpenChange(open: boolean) {
	isOpen.value = open;
	if (open && !hasFetchedForWorkflow.value) {
		isLoading.value = true;
		try {
			await chatStore.fetchSessions(true, { type: 'manual' });
			hasFetchedForWorkflow.value = true;
		} finally {
			isLoading.value = false;
		}
	}
}

function handleSelectSession(sessionId: string) {
	if (sessionId.startsWith('__group-')) return;
	emit('select-session', sessionId);
}

// Reset fetch state when workflow changes so we re-fetch on next open
watch(
	() => props.workflowId,
	() => {
		isOpen.value = false;
		hasFetchedForWorkflow.value = false;
	},
);
</script>

<template>
	<N8nDropdownMenu
		:model-value="isOpen"
		:items="menuItems"
		:portal-target="portalTarget"
		:modal="!isInPopOut"
		:loading="isLoading"
		:empty-text="i18n.baseText('chatHub.canvas.session.noSessions')"
		placement="bottom-start"
		data-test-id="canvas-chat-session-dropdown"
		width="20rem"
		max-height="360px"
		@update:model-value="handleOpenChange"
		@select="handleSelectSession"
	>
		<template #trigger>
			<button
				type="button"
				:class="[$style.trigger, { [$style.open]: isOpen }]"
				:title="
					i18n.baseText('chatHub.canvas.session.tooltip.sessionId', {
						interpolate: { sessionId: props.sessionId },
					})
				"
			>
				<N8nText size="small" :class="$style.triggerText">
					{{ sessionTitle }}
				</N8nText>
				<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
			</button>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.trigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;
	max-width: 200px;
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--foreground--tint-1);
	}
}

.triggerText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chevron {
	flex-shrink: 0;
	transition: transform 150ms ease;

	.open & {
		transform: rotate(180deg);
	}
}
</style>
