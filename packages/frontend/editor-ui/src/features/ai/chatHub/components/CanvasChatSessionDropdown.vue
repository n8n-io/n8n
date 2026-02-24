<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import {
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRoot,
	DropdownMenuTrigger,
} from 'reka-ui';
import type { ChatHubSessionDto, ChatSessionId } from '@n8n/api-types';
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

const isOpen = ref(false);
const isLoading = ref(false);
const hasFetchedForWorkflow = ref(false);

const workflowSessions = computed(() => {
	const ids = chatStore.sessions.ids ?? [];
	return ids.reduce<ChatHubSessionDto[]>((acc, id) => {
		const s = chatStore.sessions.byId[id];
		if (s && s.workflowId === props.workflowId && s.type === 'manual') {
			acc.push(s);
		}
		return acc;
	}, []);
});

const groupedSessions = computed(() => groupConversationsByDate(workflowSessions.value));
const hasNoSessions = computed(() => workflowSessions.value.length === 0 && !isLoading.value);

async function handleOpenChange(open: boolean) {
	isOpen.value = open;
	if (open && !hasFetchedForWorkflow.value) {
		hasFetchedForWorkflow.value = true;
		isLoading.value = true;
		try {
			await chatStore.fetchSessions(true, { type: 'manual' });
		} finally {
			isLoading.value = false;
		}
	}
}

function handleSelectSession(sessionId: ChatSessionId) {
	emit('select-session', sessionId);
	isOpen.value = false;
}

function formatSessionLabel(session: ChatHubSessionDto): string {
	return session.id;
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
	<DropdownMenuRoot :open="isOpen" @update:open="handleOpenChange">
		<DropdownMenuTrigger
			:class="[$style.trigger, { [$style.open]: isOpen }]"
			:title="
				i18n.baseText('chatHub.canvas.session.tooltip.sessionId', {
					interpolate: { sessionId: props.sessionId },
				})
			"
			data-test-id="canvas-chat-session-dropdown"
		>
			<N8nText size="small" :class="$style.triggerText">
				{{ sessionTitle }}
			</N8nText>
			<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
		</DropdownMenuTrigger>

		<DropdownMenuPortal>
			<DropdownMenuContent
				:class="$style.content"
				:side-offset="4"
				align="start"
				:avoid-collisions="true"
			>
				<div v-if="isLoading" :class="$style.emptyState">
					<N8nText size="small" color="text-light">…</N8nText>
				</div>

				<div v-else-if="hasNoSessions" :class="$style.emptyState">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('chatHub.canvas.session.noSessions') }}
					</N8nText>
				</div>

				<template v-else>
					<DropdownMenuGroup
						v-for="group in groupedSessions"
						:key="group.group"
						:class="$style.group"
					>
						<DropdownMenuLabel :class="$style.groupLabel">
							{{ group.group }}
						</DropdownMenuLabel>
						<DropdownMenuItem
							v-for="session in group.sessions"
							:key="session.id"
							:class="[$style.sessionItem, { [$style.active]: session.id === props.sessionId }]"
							@select="handleSelectSession(session.id)"
						>
							<span :class="$style.sessionTitle">
								{{ formatSessionLabel(session) }}
							</span>
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</template>
			</DropdownMenuContent>
		</DropdownMenuPortal>
	</DropdownMenuRoot>
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

.content {
	min-width: 240px;
	max-width: 320px;
	max-height: 360px;
	overflow: auto;
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow:
		rgba(0, 0, 0, 0.1) 0 10px 15px -3px,
		rgba(0, 0, 0, 0.05) 0 4px 6px -2px;
	padding: var(--spacing--3xs);
	z-index: 9999;

	&[data-side='bottom'] {
		animation: slideDown 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	&[data-side='top'] {
		animation: slideUp 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}
}

.emptyState {
	padding: var(--spacing--sm);
	text-align: center;
}

.group + .group {
	margin-top: var(--spacing--4xs);
}

.groupLabel {
	padding: var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-2);
	line-height: 1;
}

.sessionItem {
	display: flex;
	align-items: center;
	width: 100%;
	height: var(--spacing--xl);
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	cursor: pointer;
	user-select: none;
	font-size: var(--font-size--2xs);
	line-height: 1;
	color: var(--color--text--shade-1);
	outline: none;

	&[data-highlighted] {
		background-color: var(--color--foreground--tint-1);
		cursor: pointer;
	}

	&.active {
		font-weight: var(--font-weight--bold);
	}
}

.sessionTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideUp {
	from {
		opacity: 0;
		transform: translateY(4px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
