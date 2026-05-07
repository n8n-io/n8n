<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useInstanceAiStore } from './instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW } from './constants';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS } from './emptyStateSuggestions';
import { useCreditWarningBanner } from './composables/useCreditWarningBanner';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiEmptyState from './components/InstanceAiEmptyState.vue';
import InstanceAiStatusBar from './components/InstanceAiStatusBar.vue';
import InstanceAiViewHeader from './components/InstanceAiViewHeader.vue';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';

const store = useInstanceAiStore();
const { isLowCredits } = storeToRefs(store);
const rootStore = useRootStore();
const router = useRouter();
const { goToUpgrade } = usePageRedirectionHelper();
const creditBanner = useCreditWarningBanner(isLowCredits);

// Reset to a blank "no active thread" state so the sidebar doesn't keep
// highlighting the previous thread alongside the empty main view, and SSE
// from any prior thread is torn down. A fresh placeholder UUID is generated;
// the next sendMessage promotes it to a real thread via syncThread.
store.clearCurrentThread();

const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);

onMounted(() => {
	void nextTick(() => chatInputRef.value?.focus());
});

function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	const threadId = store.currentThreadId;
	// Kick off the send and the route change in parallel.
	// `sendMessage` runs its synchronous prelude before its first await:
	// pushes the optimistic user message into the runtime and opens the
	// SSE connection. By the time the router resolves the navigation,
	// ThreadView mounts with that state already in place. Backend
	// persistence (`syncThread` → `postMessage`) completes in the
	// background while the user is already on the thread page.
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
					<InstanceAiStatusBar />
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
						:suggestions="INSTANCE_AI_EMPTY_STATE_SUGGESTIONS"
						@submit="handleSubmit"
						@stop="handleStop"
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
