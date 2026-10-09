<script setup lang="ts">
import type {
	SelfHealingResultDetail,
	SelfHealingResultActionResponse,
	SelfHealingResultContinuationResponse,
} from '@n8n/api-types';
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
	continueSelfHealingResult,
	fetchSelfHealingResult,
	reviewSelfHealingResult,
	type SelfHealingResultAction,
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
	action: SelfHealingResultAction;
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
	action: SelfHealingResultAction,
	onItemChange: (change: InboxItemChange) => void,
	isSelected: (id: string) => boolean,
	recovered = false,
	continuation?: Pick<SelfHealingResultContinuationResponse, 'chatThreadId' | 'chatStartError'>,
): Promise<boolean> {
	store.acceptResult(result);
	reconcile(before, result, onItemChange);
	if (action === 'dismiss') return result.reviewState !== 'open';
	if (action === 'chat') {
		const threadId = recovered ? result.continuationThreadId : continuation?.chatThreadId;
		if (!threadId) return false;
		if (isSelected(result.resultId)) {
			try {
				const opened = await chat?.start({ threadId });
				if (opened && continuation?.chatStartError) {
					showMessage({
						type: 'warning',
						duration: 0,
						title: i18n.baseText('inbox.selfHealing.action.chatStartError'),
						message: continuation.chatStartError,
					});
				}
			} catch (cause) {
				showError(cause, i18n.baseText('inbox.selfHealing.action.chatError'));
			}
		}
		return true;
	}
	if (action === 'editor') {
		if (recovered && !result.continuedAt && before.reviewState === 'open') return false;
		if (isSelected(result.resultId)) await openEditor(result.workflowId);
		return true;
	}
	if (result.reviewState !== 'applied') return false;
	if (!isSelected(result.resultId)) return true;
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
	return true;
}

async function retryDetail() {
	const unresolved = unresolvedAction.value;
	if (!unresolved) {
		await store.refreshDetail();
		return;
	}
	if (pendingAction.value) return;
	const target = { ...props.selection };
	const onItemChange = props.onItemChange;
	const isSelected = props.isSelected;
	pendingAction.value = unresolved.action;
	try {
		const result = await fetchSelfHealingResult(rootStore.restApiContext, target);
		await finishAction(
			unresolved.before,
			result,
			unresolved.action,
			onItemChange,
			isSelected,
			true,
		);
		if (store.isSelected(target)) unresolvedAction.value = null;
	} catch (cause) {
		store.setError(target, cause);
	} finally {
		pendingAction.value = null;
	}
}

async function onAction(action: SelfHealingResultAction) {
	const before = detail.value;
	if (!before || pendingAction.value || !store.isSelected(props.selection)) return;
	if (action !== 'chat' && action !== 'editor' && before.reviewState !== 'open') return;
	if (action === 'approve-and-publish' && (!canPublish.value || before.outcome !== 'fix_ready'))
		return;
	if (action === 'chat' && !chat?.available.value) return;

	const target = { ...props.selection };
	const isSelected = props.isSelected;
	const onItemChange = props.onItemChange;
	pendingAction.value = action;
	try {
		if (action === 'editor' || action === 'chat') {
			const result = await continueSelfHealingResult(rootStore.restApiContext, target, action);
			await finishAction(before, result, action, onItemChange, isSelected, false, result);
		} else {
			const result = await reviewSelfHealingResult(rootStore.restApiContext, target, action);
			await finishAction(before, result, action, onItemChange, isSelected);
		}
	} catch (cause) {
		// Read a saved receipt before offering another request after a lost response.
		try {
			const current = await fetchSelfHealingResult(rootStore.restApiContext, target);
			if (await finishAction(before, current, action, onItemChange, isSelected, true)) return;
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
