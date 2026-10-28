<script setup lang="ts">
import type { SelfHealingResultActionResponse, SelfHealingResultDetail } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nCallout, N8nEmptyState, N8nLoading } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import {
	capabilities,
	capabilityRegistry,
	type SelfHealingChatStartOutcome,
} from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { InboxItemChange } from '../inbox.constants';
import SelfHealingResultContent from './SelfHealingResultContent.vue';
import { useSelfHealingResultStore } from './selfHealingResult.store';
import {
	fetchSelfHealingResult,
	reviewSelfHealingResult,
	type SelfHealingPublishAccess,
	type SelfHealingResultAction,
	type SelfHealingReviewAction,
	type SelfHealingSelection,
} from './selfHealingResults.api';

type ChatRetry = {
	target: SelfHealingSelection;
	projectId: string;
	result: SelfHealingResultDetail;
	reason: Exclude<SelfHealingChatStartOutcome, 'started'> | 'unconfirmed';
};

const props = defineProps<{
	selection: SelfHealingSelection;
	tab: 'activity' | 'changes';
	onItemChange: (change: InboxItemChange) => void;
	isSelected: (id: string) => boolean;
}>();
const emit = defineEmits<{ 'update:tab': [tab: 'activity' | 'changes'] }>();

const store = useSelfHealingResultStore();
const { detail, workflow, loading, error, workflowError, pendingAction } = storeToRefs(store);
const rootStore = useRootStore();
const router = useRouter();
const i18n = useI18n();
const { showError, showMessage } = useToast();
const chat = capabilityRegistry.tryUse(capabilities.createSelfHealingChatHandoff)?.();
const chatRetry = ref<ChatRetry | null>(null);
let reconcileOnRetry: ((current: SelfHealingResultDetail) => Promise<boolean>) | null = null;

const workflowName = computed(
	() =>
		workflow.value?.name ??
		detail.value?.suggestion?.payload.original.name ??
		props.selection.workflowId,
);
const publishAccess = computed<SelfHealingPublishAccess>(() => {
	if (!workflow.value) return 'unknown';
	return workflow.value.scopes.includes('workflow:publish') ? 'allowed' : 'denied';
});
const errorKind = computed(() => {
	if (error.value instanceof ResponseError) {
		if (error.value.httpStatusCode === 404) return 'notFound';
		if (error.value.httpStatusCode === 403) return 'forbidden';
	}
	return 'loadError';
});

watch(
	[() => props.selection.id, () => props.selection.projectId, () => props.selection.workflowId],
	() => {
		reconcileOnRetry = null;
		chatRetry.value = null;
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

function notifyResultClosed(
	before: SelfHealingResultDetail,
	after: SelfHealingResultDetail,
	onItemChange: (change: InboxItemChange) => void,
) {
	if (before.reviewState === 'open' && after.reviewState !== 'open') {
		onItemChange({
			type: 'self_healing_result',
			id: after.resultId,
			state: 'closed',
			updatedAt: after.updatedAt,
		});
	}
}

async function openEditor(workflowId: string) {
	try {
		const failure = await router.push({ name: VIEWS.WORKFLOW, params: { workflowId } });
		if (failure) throw failure;
	} catch (cause) {
		showError(cause, i18n.baseText('inbox.selfHealing.action.openEditorError'));
	}
}

async function startChat(request: Omit<ChatRetry, 'reason'>) {
	let outcome: SelfHealingChatStartOutcome;
	try {
		outcome = (await chat?.start(request.projectId, request.result)) ?? 'unavailable';
	} catch (cause) {
		outcome = 'failed';
		if (store.isSelected(request.target)) {
			showError(cause, i18n.baseText('inbox.selfHealing.action.chatError'));
		}
	}

	if (!store.isSelected(request.target)) return;
	chatRetry.value = outcome === 'started' ? null : { ...request, reason: outcome };
}

async function retryChat() {
	const retry = chatRetry.value;
	if (!retry || !chat?.available.value || !store.isSelected(retry.target)) return;
	if (!store.beginAction(retry.target, 'chat')) return;

	try {
		await startChat(retry);
	} finally {
		store.endAction(retry.target);
	}
}

async function retryDetail() {
	if (pendingAction.value) return;

	const reconcile = reconcileOnRetry;
	const result = await store.refreshDetail();
	if (!reconcile || !result || reconcileOnRetry !== reconcile) return;

	reconcileOnRetry = null;
	await reconcile(result);
}

async function onAction(action: SelfHealingResultAction) {
	const before = detail.value;
	if (before?.reviewState !== 'open' || pendingAction.value || !store.isSelected(props.selection))
		return;

	if (
		action === 'approve-and-publish' &&
		(publishAccess.value !== 'allowed' || before.outcome !== 'fix_ready')
	)
		return;
	if (action === 'chat' && !chat?.available.value) return;

	const target = { ...props.selection };
	if (!store.beginAction(target, action)) return;

	const isSelected = props.isSelected;
	const onItemChange = props.onItemChange;
	const isContinuation = action === 'chat' || action === 'editor';

	let reviewAction: SelfHealingReviewAction;
	if (isContinuation) {
		reviewAction = before.suggestion ? 'apply' : 'dismiss';
	} else {
		reviewAction = action;
	}
	const closedState = reviewAction === 'dismiss' ? 'dismissed' : 'applied';
	let chatProjectId: string | null = null;

	/**
	 * Without a response, the saved state does not show which request closed the result.
	 * So the chat waits for an explicit start, and publication stays unconfirmed.
	 */
	async function continueAfterClose(
		result: SelfHealingResultActionResponse,
		responseLost: boolean,
	) {
		// An outdated or concurrently discarded suggestion leaves nothing to continue with.
		const closed =
			result.reviewState === closedState ||
			(action === 'dismiss' && result.reviewState === 'discarded');
		if (!isSelected(target.id) || !closed) return false;

		if (chatProjectId) {
			const request = { target, projectId: chatProjectId, result };
			if (responseLost) chatRetry.value = { ...request, reason: 'unconfirmed' };
			else await startChat(request);
		} else if (action !== 'dismiss') {
			if (responseLost && action === 'approve-and-publish') {
				showMessage({
					type: 'warning',
					duration: 0,
					title: i18n.baseText('inbox.selfHealing.action.publishUnconfirmed.title'),
					message: i18n.baseText('inbox.selfHealing.action.publishUnconfirmed.message'),
				});
			} else if (result.publishError !== undefined) {
				showMessage({
					type: 'warning',
					duration: 0,
					title: i18n.baseText('inbox.selfHealing.action.publishError'),
					message: result.publishError,
				});
			}

			await openEditor(result.workflowId);
		}
		return true;
	}

	try {
		if (action === 'chat') {
			// Load the chat project before closing, so a failed lookup leaves the result open.
			chatProjectId = (await chat?.resolveProjectId().catch(() => null)) ?? null;
			if (!isSelected(target.id)) return;
			if (!chatProjectId) {
				showMessage({
					type: 'error',
					title: i18n.baseText('inbox.selfHealing.action.chatError'),
					message: i18n.baseText('inbox.selfHealing.action.chatProjectError'),
				});
				return;
			}
		}

		const result = await reviewSelfHealingResult(rootStore.restApiContext, target, reviewAction);

		store.acceptResult(result);
		await continueAfterClose(result, false);
		notifyResultClosed(before, result, onItemChange);
	} catch (cause) {
		// Refresh saved state before the user retries a request with a lost response.
		const reconcile = async (current: SelfHealingResultDetail) => {
			const continued = !isRejected(cause) && (await continueAfterClose(current, true));
			notifyResultClosed(before, current, onItemChange);
			return continued;
		};

		try {
			const current = await fetchSelfHealingResult(rootStore.restApiContext, target);

			store.acceptResult(current);
			if (isSelected(target.id)) void store.refreshWorkflow();
			if (await reconcile(current)) return;
		} catch (readError) {
			store.setError(target, readError);
			if (isSelected(target.id)) reconcileOnRetry = reconcile;
		}

		if (isSelected(target.id)) showError(cause, i18n.baseText('inbox.selfHealing.action.error'));
	} finally {
		store.endAction(target);
	}
}
</script>

<template>
	<section
		:class="$style.detail"
		data-test-id="inbox-self-healing-detail"
		:data-result-id="selection.id"
	>
		<template v-if="loading || error || !detail">
			<div :class="$style.columnTitle" />
			<N8nLoading v-if="loading" :loading="true" :rows="3" />
			<div v-else-if="error" :class="$style.error" data-test-id="self-healing-detail-error">
				<N8nEmptyState
					:heading="i18n.baseText(`inbox.selfHealing.detail.${errorKind}.title`)"
					:description="i18n.baseText(`inbox.selfHealing.detail.${errorKind}.body`)"
				/>
				<N8nButton :loading="pendingAction !== null" @click="retryDetail()">{{
					i18n.baseText('generic.retry')
				}}</N8nButton>
			</div>
		</template>
		<template v-else>
			<SelfHealingResultContent
				:detail="detail"
				:workflow-name="workflowName"
				:tab="tab"
				:pending-action="pendingAction"
				:publish-access="publishAccess"
				:can-chat="chat?.available.value ?? false"
				@update:tab="emit('update:tab', $event)"
				@action="onAction"
			>
				<template v-if="workflowError || chatRetry" #notice>
					<N8nCallout v-if="workflowError" theme="warning">
						{{ i18n.baseText('inbox.selfHealing.detail.metadataError') }}
						<template #trailingContent>
							<N8nButton variant="ghost" @click="store.refreshWorkflow()">{{
								i18n.baseText('generic.retry')
							}}</N8nButton>
						</template>
					</N8nCallout>
					<N8nCallout
						v-if="chatRetry"
						:theme="chatRetry.reason === 'unconfirmed' ? 'info' : 'warning'"
						data-test-id="self-healing-chat-retry"
					>
						{{ i18n.baseText(`inbox.selfHealing.chatRetry.${chatRetry.reason}`) }}
						<template #trailingContent>
							<N8nButton
								variant="ghost"
								:disabled="!chat?.available.value"
								:loading="pendingAction === 'chat'"
								data-test-id="self-healing-chat-retry-button"
								@click="retryChat()"
								>{{ i18n.baseText('inbox.selfHealing.action.continueWithAssistant') }}</N8nButton
							>
						</template>
					</N8nCallout>
				</template>
			</SelfHealingResultContent>
		</template>
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
