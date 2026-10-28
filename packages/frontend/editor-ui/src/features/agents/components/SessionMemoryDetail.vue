<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { AgentThreadMemoryDto } from '@n8n/api-types';
import { N8nBadge, N8nIconButton, N8nLink, N8nText } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { MODAL_CONFIRM } from '@/app/constants';
import { toDayMonth } from '@/app/utils/formatters/dateFormatter';
import { AGENT_SESSION_DETAIL_VIEW } from '../constants';
import { deleteAgentMemoryCapture, deleteAgentMemoryEntry } from '../composables/useAgentApi';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import type { TimelineItem } from '../session-timeline.types';
import {
	sessionMemoryCards,
	type SessionMemoryCard,
	type SessionMemoryOrigin,
} from '../utils/sessionMemoryCards';

const props = defineProps<{
	item: TimelineItem;
	memory?: AgentThreadMemoryDto;
	projectId: string;
	agentId: string;
	threadId: string;
}>();

const emit = defineEmits<{ deleted: [] }>();

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const { showError, showMessage } = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();
const { canUpdate } = useAgentPermissions(() => props.projectId);

// Active and stored are the normal case; only unusual states get a badge.
const BADGE_STATUSES = new Set(['pending', 'replaced', 'failed', 'deleted']);

const deletingKey = ref<string | null>(null);

const cards = computed(() => sessionMemoryCards(props.item, props.memory, props.threadId));

function originText(origin: SessionMemoryOrigin): string {
	if (origin.kind === 'this-run') {
		return i18n.baseText('agentSessions.timeline.memory.origin.thisRun');
	}
	const key =
		origin.kind === 'this-session'
			? 'agentSessions.timeline.memory.origin.thisSession'
			: 'agentSessions.timeline.memory.origin.previousSession';
	return i18n.baseText(key, { interpolate: { date: toDayMonth(origin.createdAt) } });
}

function originHref(origin: SessionMemoryOrigin): string | undefined {
	if (origin.kind !== 'previous-session' || !origin.threadId) return undefined;
	return router.resolve({
		name: AGENT_SESSION_DETAIL_VIEW,
		params: { projectId: props.projectId, agentId: props.agentId, threadId: origin.threadId },
	}).href;
}

function statusText(status: NonNullable<SessionMemoryCard['status']>): string {
	return i18n.baseText(`agentSessions.timeline.memory.status.${status}` as BaseTextKey);
}

async function confirmDelete(target: NonNullable<SessionMemoryCard['deleteTarget']>) {
	const prefix =
		target.type === 'entry'
			? 'agents.builder.memory.entries.deleteModal'
			: 'agentSessions.timeline.memory.deleteFlagModal';
	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText(`${prefix}.title` as BaseTextKey),
		description: i18n.baseText(`${prefix}.description` as BaseTextKey),
		confirmButtonText: i18n.baseText('agents.builder.memory.entries.deleteModal.button.delete'),
		cancelButtonText: i18n.baseText('generic.cancel'),
	});
	return confirmed === MODAL_CONFIRM;
}

async function onDelete(card: SessionMemoryCard) {
	const target = card.deleteTarget;
	if (!target || deletingKey.value !== null) return;
	if (!(await confirmDelete(target))) return;

	const remove = target.type === 'entry' ? deleteAgentMemoryEntry : deleteAgentMemoryCapture;
	deletingKey.value = card.key;
	try {
		await remove(rootStore.restApiContext, props.projectId, props.agentId, target.id);
		showMessage({
			title: i18n.baseText('agents.builder.memory.entries.deleted'),
			type: 'success',
		});
		emit('deleted');
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.memory.entries.deleteError'));
	} finally {
		deletingKey.value = null;
	}
}
</script>

<template>
	<N8nText
		v-if="cards.length === 0"
		size="small"
		color="text-light"
		data-test-id="session-memory-empty"
	>
		{{ i18n.baseText('agentSessions.timeline.memory.empty') }}
	</N8nText>
	<ul v-else :class="$style.list">
		<li
			v-for="card in cards"
			:key="card.key"
			:class="[$style.card, { [$style.deleted]: card.status === 'deleted' }]"
			data-test-id="session-memory-card"
		>
			<div :class="$style.copy">
				<N8nText :class="$style.content">{{ card.content }}</N8nText>
				<N8nText
					v-if="card.evidence || card.origin"
					size="small"
					color="text-light"
					:class="$style.evidence"
				>
					<template v-if="card.evidence">“{{ card.evidence }}”</template>
					<template v-if="card.origin">
						—
						<N8nLink
							v-if="originHref(card.origin)"
							:to="originHref(card.origin)"
							new-window
							rel="noopener"
							size="small"
							data-test-id="session-memory-origin-link"
						>
							{{ originText(card.origin) }}
						</N8nLink>
						<template v-else>{{ originText(card.origin) }}</template>
					</template>
				</N8nText>
				<N8nBadge
					v-if="card.status && BADGE_STATUSES.has(card.status)"
					variant="outline"
					size="xsmall"
					data-test-id="session-memory-status"
				>
					{{ statusText(card.status) }}
				</N8nBadge>
			</div>
			<N8nIconButton
				v-if="canUpdate && card.deleteTarget"
				icon="trash-2"
				variant="ghost"
				size="small"
				:disabled="deletingKey !== null"
				:aria-label="i18n.baseText('agents.builder.memory.entries.delete')"
				data-test-id="session-memory-delete"
				@click="onDelete(card)"
			/>
		</li>
	</ul>
</template>

<style module lang="scss">
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.card {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
}

.deleted {
	opacity: 0.5;
}

.copy {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.content {
	overflow-wrap: anywhere;
}

.evidence {
	font-style: italic;
	overflow-wrap: anywhere;
}
</style>
