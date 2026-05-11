<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useInstanceAiStore } from './instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW } from './constants';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS } from './emptyStateSuggestions';
import { useCreditWarningBanner } from './composables/useCreditWarningBanner';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiEmptyState from './components/InstanceAiEmptyState.vue';
import InstanceAiViewHeader from './components/InstanceAiViewHeader.vue';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';

const store = useInstanceAiStore();
const { isLowCredits } = storeToRefs(store);
const rootStore = useRootStore();
const router = useRouter();
const toast = useToast();
const { goToUpgrade } = usePageRedirectionHelper();
const creditBanner = useCreditWarningBanner(isLowCredits);

// Reset to a blank "no active thread" state so the sidebar doesn't keep
// highlighting the previous thread alongside the empty main view, and SSE
// from any prior thread is torn down. A fresh placeholder UUID is generated;
// `handleSubmit` promotes it to a real thread via `syncThread` before navigation.
store.clearCurrentThread();

const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);

onMounted(() => {
	void nextTick(() => chatInputRef.value?.focus());
});

async function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	const threadId = store.currentThreadId;

	// Persist the thread on the BE first. Otherwise we'd navigate to
	// `/instance-ai/:threadId` for a thread the BE doesn't know about, and the
	// follow-up `postMessage` would 404.
	try {
		await store.syncThread(threadId);
	} catch {
		toast.showError(new Error('Failed to start a new thread. Try again.'), 'Send failed');
		return;
	}

	void store.sendMessage(message, attachments, rootStore.pushRef);
	void router.replace({
		name: INSTANCE_AI_THREAD_VIEW,
		params: { threadId },
	});
}

function handleStop() {
	void store.cancelRun();
}
</script>

<template>
	<div :class="$style.chatArea">
		<InstanceAiViewHeader />

		<div :class="$style.contentArea">
			<div :class="$style.emptyLayout">
				<InstanceAiEmptyState />
				<div :class="$style.centeredInput">
					<CreditWarningBanner
						v-if="creditBanner.visible.value"
						:credits-remaining="store.creditsRemaining"
						:credits-quota="store.creditsQuota"
						@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
						@dismiss="creditBanner.dismiss()"
					/>
					<InstanceAiInput
						ref="chatInputRef"
						:is-streaming="store.isStreaming"
						:is-sending-message="store.isSendingMessage"
						:is-awaiting-confirmation="store.isAwaitingConfirmation"
						:current-thread-id="store.currentThreadId"
						:amend-context="store.amendContext"
						:contextual-suggestion="store.contextualSuggestion"
						:research-mode="store.researchMode"
						:suggestions="INSTANCE_AI_EMPTY_STATE_SUGGESTIONS"
						@submit="handleSubmit"
						@stop="handleStop"
						@toggle-research-mode="store.toggleResearchMode()"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.chatArea {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	position: relative;
	background-color: var(--color--background--light-2);
}

.contentArea {
	display: flex;
	flex: 1;
	min-height: 0;
	position: relative;
}

.emptyLayout {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg);
	padding-top: 20vh;
}

.centeredInput {
	width: 100%;
	max-width: 680px;
}
</style>
