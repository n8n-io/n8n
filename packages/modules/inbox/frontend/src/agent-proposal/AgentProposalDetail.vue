<script setup lang="ts">
import type { SelfHealingAgentResultDetail } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nEmptyState, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { storeToRefs } from 'pinia';
import { computed, watch } from 'vue';

import type { InboxDetailTab, InboxItemChange } from '../inbox.constants';
import {
	fetchAgentProposal,
	reviewAgentProposal,
	type AgentProposalAction,
	type AgentProposalSelection,
} from './agentProposal.api';
import { useAgentProposalStore } from './agentProposal.store';
import AgentProposalContent from './AgentProposalContent.vue';

const props = defineProps<{
	selection: AgentProposalSelection;
	tab: InboxDetailTab;
	onItemChange: (change: InboxItemChange) => void;
	isSelected: (id: string) => boolean;
}>();
const emit = defineEmits<{ 'update:tab': [tab: InboxDetailTab] }>();

const store = useAgentProposalStore();
const { detail, loading, error, pendingAction } = storeToRefs(store);
const rootStore = useRootStore();
const i18n = useI18n();
const { showError, showMessage } = useToast();
let reconcileOnRetry: ((current: SelfHealingAgentResultDetail) => void) | null = null;

const errorKind = computed(() => {
	if (error.value instanceof ResponseError) {
		if (error.value.httpStatusCode === 404) return 'notFound';
		if (error.value.httpStatusCode === 403) return 'forbidden';
	}
	return 'loadError';
});

watch(
	[() => props.selection.id, () => props.selection.projectId],
	() => {
		reconcileOnRetry = null;
		void store.select(props.selection);
	},
	{ immediate: true },
);

/** A client error status means the server rejected the action, so nothing was saved. */
function isRejected(cause: unknown) {
	return (
		cause instanceof ResponseError &&
		cause.httpStatusCode !== undefined &&
		cause.httpStatusCode < 500
	);
}

function notifyClosed(
	after: SelfHealingAgentResultDetail,
	onItemChange: (change: InboxItemChange) => void,
	advance: boolean,
) {
	if (after.reviewState === 'open') return;

	onItemChange({
		type: 'self_healing_agent_result',
		id: after.resultId,
		state: 'closed',
		updatedAt: after.updatedAt,
		advance,
	});
}

async function retryDetail() {
	if (pendingAction.value) return;

	const reconcile = reconcileOnRetry;
	await store.retryDetail((result) => {
		if (!reconcile || reconcileOnRetry !== reconcile) return;

		reconcileOnRetry = null;
		reconcile(result);
	});
}

async function onAction(action: AgentProposalAction) {
	if (
		detail.value?.reviewState !== 'open' ||
		pendingAction.value ||
		!store.isSelected(props.selection)
	)
		return;

	const target = { ...props.selection };
	if (!store.beginAction(target, action)) return;

	const isSelected = props.isSelected;
	const onItemChange = props.onItemChange;
	const closedState = action === 'apply' ? 'applied' : 'dismissed';

	try {
		const result = await reviewAgentProposal(rootStore.restApiContext, target, action);

		store.acceptResult(result);
		// A failed step keeps the proposal open. The content shows the error and Apply stays available.
		if (result.reviewState === 'applied') {
			showMessage({ type: 'success', title: i18n.baseText('inbox.agentProposal.action.applied') });
		}
		// An outdated proposal stays selected, so the reviewer can read why nothing was applied.
		notifyClosed(result, onItemChange, result.reviewState !== 'outdated');
	} catch (cause) {
		// Refresh saved state before the user retries a request with a lost response.
		const reconcile = (current: SelfHealingAgentResultDetail) =>
			notifyClosed(current, onItemChange, false);

		try {
			const current = await fetchAgentProposal(rootStore.restApiContext, target);

			reconcile(current);
			store.acceptResult(current);
			// The response was lost, but the saved state shows that the action completed.
			if (!isRejected(cause) && current.reviewState === closedState) return;
		} catch (readError) {
			store.setError(target, readError);
			if (isSelected(target.id)) reconcileOnRetry = reconcile;
		}

		if (isSelected(target.id)) showError(cause, i18n.baseText('inbox.agentProposal.action.error'));
	} finally {
		store.endAction(target);
	}
}
</script>

<template>
	<section
		:class="$style.detail"
		data-test-id="inbox-agent-proposal-detail"
		:data-result-id="selection.id"
	>
		<template v-if="loading || error || !detail">
			<div :class="$style.columnTitle" />
			<N8nLoading v-if="loading" :loading="true" :rows="3" />
			<div v-else-if="error" :class="$style.error" data-test-id="agent-proposal-detail-error">
				<N8nEmptyState
					:heading="i18n.baseText(`inbox.agentProposal.detail.${errorKind}.title`)"
					:description="i18n.baseText(`inbox.agentProposal.detail.${errorKind}.body`)"
				/>
				<N8nButton :loading="pendingAction !== null" @click="retryDetail()">{{
					i18n.baseText('generic.retry')
				}}</N8nButton>
			</div>
		</template>
		<AgentProposalContent
			v-else
			:detail="detail"
			:tab="tab"
			:pending-action="pendingAction"
			@update:tab="emit('update:tab', $event)"
			@action="onAction"
		/>
	</section>
</template>

<style lang="scss" module>
.detail {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

.columnTitle {
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}

.error {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	height: 100%;
}
</style>
