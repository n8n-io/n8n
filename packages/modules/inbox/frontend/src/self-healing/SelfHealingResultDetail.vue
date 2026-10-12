<script setup lang="ts">
import type { SelfHealingResultDetail } from '@n8n/api-types';
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
const unresolvedResult = ref<SelfHealingResultDetail | null>(null);
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
		unresolvedResult.value = null;
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

async function retryDetail() {
	if (pendingAction.value) return;
	const before = unresolvedResult.value;
	const onItemChange = props.onItemChange;
	const result = await store.refreshDetail();
	if (before && result) {
		reconcile(before, result, onItemChange);
		if (unresolvedResult.value === before) unresolvedResult.value = null;
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
		const result = await reviewSelfHealingResult(
			rootStore.restApiContext,
			target,
			action === 'editor' ? 'apply' : action,
		);
		store.acceptResult(result);
		reconcile(before, result, onItemChange);
		if (!isSelected(target.id) || action === 'dismiss') return;
		if (action === 'chat') {
			try {
				if (result.chatThreadId) await chat?.start({ threadId: result.chatThreadId });
			} catch (cause) {
				showError(cause, i18n.baseText('inbox.selfHealing.action.chatError'));
			}
		} else if (action === 'editor' || result.reviewState === 'applied') {
			if (result.publishError !== undefined) {
				showMessage({
					type: 'warning',
					duration: 0,
					title: i18n.baseText('inbox.selfHealing.action.publishError'),
					message: result.publishError,
				});
			}
			await openEditor(result.workflowId);
		}
	} catch (cause) {
		// Refresh saved state before the user retries a request with a lost response.
		try {
			const current = await fetchSelfHealingResult(rootStore.restApiContext, target);
			store.acceptResult(current);
			reconcile(before, current, onItemChange);
			if (isSelected(target.id)) void store.refreshWorkflow();
		} catch (readError) {
			store.setError(target, readError);
			if (isSelected(target.id)) unresolvedResult.value = before;
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
