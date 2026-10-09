<script setup lang="ts">
import type { SelfHealingResultDetail, SelfHealingResultActionResponse } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nCallout, N8nEmptyState, N8nLoading } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
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
	type SelfHealingReviewAction,
	type SelfHealingSelection,
} from './selfHealingResults.api';

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
const unresolvedAction = ref<{
	before: SelfHealingResultDetail;
	action: SelfHealingReviewAction;
} | null>(null);
const workflowName = computed(
	() =>
		workflow.value?.name ??
		detail.value?.suggestion?.payload.original.name ??
		props.selection.workflowId,
);
const canPublish = computed(() => workflow.value?.scopes.includes('workflow:publish') ?? false);
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
		unresolvedAction.value = null;
		void store.select(props.selection);
	},
	{ immediate: true },
);

function reconcile(
	before: SelfHealingResultDetail,
	after: SelfHealingResultDetail,
	onItemChange = props.onItemChange,
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

async function openEditor(workflowId = props.selection.workflowId) {
	try {
		const failure = await router.push({ name: VIEWS.WORKFLOW, params: { workflowId } });
		if (failure) throw failure;
	} catch (cause) {
		showError(cause, i18n.baseText('inbox.selfHealing.action.openEditorError'));
	}
}

async function finishAction(
	before: SelfHealingResultDetail,
	result: SelfHealingResultActionResponse,
	action: SelfHealingReviewAction,
	recovered = false,
) {
	store.acceptResult(result);
	reconcile(before, result);
	if (
		!props.isSelected(result.resultId) ||
		action === 'dismiss' ||
		result.reviewState !== 'applied'
	)
		return;
	if (result.publishError !== undefined || recovered) {
		showMessage({
			type: 'warning',
			duration: 0,
			title: i18n.baseText(
				result.publishError !== undefined
					? 'inbox.selfHealing.action.publishError'
					: 'inbox.selfHealing.action.uncertainResolved',
			),
			message: result.publishError,
		});
	}
	await openEditor(result.workflowId);
}

async function retryDetail() {
	const unresolved = unresolvedAction.value;
	if (!unresolved) {
		await store.refreshDetail();
		return;
	}
	if (pendingAction.value) return;
	const target = { ...props.selection };
	pendingAction.value = unresolved.action;
	try {
		const result = await fetchSelfHealingResult(rootStore.restApiContext, target);
		await finishAction(unresolved.before, result, unresolved.action, true);
		if (store.isSelected(target)) unresolvedAction.value = null;
	} catch (cause) {
		store.setError(target, cause);
	} finally {
		pendingAction.value = null;
	}
}

async function closeAfterChat(
	before: SelfHealingResultDetail,
	target: SelfHealingSelection,
	onItemChange: (change: InboxItemChange) => void,
) {
	let current: SelfHealingResultDetail | undefined;
	try {
		current = await reviewSelfHealingResult(rootStore.restApiContext, target, 'dismiss');
	} catch {
		// Chat has already opened. Recover a lost close response without starting it again.
		try {
			current = await fetchSelfHealingResult(rootStore.restApiContext, target);
		} catch (readError) {
			store.setError(target, readError);
			if (props.isSelected(target.id)) unresolvedAction.value = { before, action: 'dismiss' };
		}
	}
	if (current) {
		store.acceptResult(current);
		reconcile(before, current, onItemChange);
		if (current.reviewState !== 'open') return;
	}
	showMessage({
		type: 'warning',
		duration: 0,
		title: i18n.baseText('inbox.selfHealing.action.chatCloseError'),
	});
}

async function onAction(action: SelfHealingReviewAction | 'chat') {
	const before = detail.value;
	if (!before || pendingAction.value || !store.isSelected(props.selection)) return;
	if (action !== 'chat' && before.reviewState !== 'open') return;
	if (action === 'approve-and-publish' && !canPublish.value) return;
	if ((action === 'apply' || action === 'approve-and-publish') && before.outcome !== 'fix_ready')
		return;
	if (action === 'chat' && (!chat?.available.value || before.outcome === 'fix_ready')) return;

	const target = { ...props.selection };
	const isSelected = props.isSelected;
	const onItemChange = props.onItemChange;
	pendingAction.value = action;
	try {
		if (action === 'chat') {
			const fresh = await fetchSelfHealingResult(rootStore.restApiContext, target);
			store.acceptResult(fresh);
			reconcile(before, fresh);
			if (!isSelected(target.id) || fresh.outcome === 'fix_ready') return;
			const opened = await chat?.start({
				resultId: fresh.resultId,
				outcome: fresh.outcome,
				report: fresh.report,
				workflowId: fresh.workflowId,
				workflowName: workflowName.value,
				...(fresh.execution.status === 'available' ? { executionId: fresh.execution.id } : {}),
			});
			if (opened && fresh.reviewState === 'open') await closeAfterChat(fresh, target, onItemChange);
			return;
		}

		const result = await reviewSelfHealingResult(rootStore.restApiContext, target, action);
		await finishAction(before, result, action);
	} catch (cause) {
		if (action === 'chat') {
			if (cause instanceof ResponseError && [403, 404].includes(cause.httpStatusCode ?? 0)) {
				store.setError(target, cause);
			}
			if (isSelected(target.id))
				showError(cause, i18n.baseText('inbox.selfHealing.action.chatError'));
			return;
		}

		// The save can commit before a response is lost. Read its receipt before offering another action.
		try {
			const current = await fetchSelfHealingResult(rootStore.restApiContext, target);
			await finishAction(before, current, action, true);
			if (!isSelected(target.id)) return;
			if (action !== 'dismiss' && current.reviewState === 'applied') return;
			if (
				action === 'dismiss' &&
				(current.reviewState === 'discarded' || current.reviewState === 'dismissed')
			)
				return;
			void store.refreshWorkflow();
		} catch (readError) {
			store.setError(target, readError);
			if (isSelected(target.id)) unresolvedAction.value = { before, action };
		}
		if (isSelected(target.id)) showError(cause, i18n.baseText('inbox.selfHealing.action.error'));
	} finally {
		pendingAction.value = null;
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
					:description="
						unresolvedAction && unresolvedAction.action !== 'dismiss' && errorKind === 'loadError'
							? i18n.baseText('inbox.selfHealing.action.uncertain')
							: i18n.baseText(`inbox.selfHealing.detail.${errorKind}.body`)
					"
				/>
				<N8nButton :loading="pendingAction !== null" @click="retryDetail()">{{
					i18n.baseText('generic.retry')
				}}</N8nButton>
				<N8nButton
					v-if="
						unresolvedAction && unresolvedAction.action !== 'dismiss' && errorKind === 'loadError'
					"
					variant="outline"
					@click="openEditor()"
				>
					{{ i18n.baseText('inbox.selfHealing.action.openInEditor') }}
				</N8nButton>
			</div>
		</template>
		<template v-else>
			<SelfHealingResultContent
				:detail="detail"
				:workflow-name="workflowName"
				:tab="tab"
				:pending-action="pendingAction"
				:can-publish="canPublish"
				:can-chat="chat?.available.value ?? false"
				@update:tab="emit('update:tab', $event)"
				@action="onAction"
				@open-editor="openEditor()"
			>
				<template v-if="workflowError" #notice>
					<N8nCallout theme="warning">
						{{ i18n.baseText('inbox.selfHealing.detail.metadataError') }}
						<template #trailingContent>
							<N8nButton variant="subtle" @click="store.refreshWorkflow()">{{
								i18n.baseText('generic.retry')
							}}</N8nButton>
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
