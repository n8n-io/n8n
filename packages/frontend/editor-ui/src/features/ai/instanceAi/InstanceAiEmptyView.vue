<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { N8nCallout, N8nIconButton, N8nTooltip, TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useInstanceAiStore } from './instanceAi.store';
import { useSidebarState } from './instanceAiLayout';
import { INSTANCE_AI_SETTINGS_VIEW, INSTANCE_AI_THREAD_VIEW } from './constants';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS } from './emptyStateSuggestions';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiEmptyState from './components/InstanceAiEmptyState.vue';
import InstanceAiStatusBar from './components/InstanceAiStatusBar.vue';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';
import CreditsSettingsDropdown from '@/features/ai/assistant/components/Agent/CreditsSettingsDropdown.vue';

const store = useInstanceAiStore();
const rootStore = useRootStore();
const sourceControlStore = useSourceControlStore();
const i18n = useI18n();
const router = useRouter();
const sidebar = useSidebarState();
const { goToUpgrade } = usePageRedirectionHelper();

const isReadOnlyEnvironment = computed(() => sourceControlStore.preferences.branchReadOnly);

// Reset to a blank "no active thread" state so the sidebar doesn't keep
// highlighting the previous thread alongside the empty main view, and SSE
// from any prior thread is torn down. A fresh placeholder UUID is generated;
// the next sendMessage promotes it to a real thread via syncThread.
store.clearCurrentThread();

// --- Credit warning banner ---
const creditBannerDismissed = ref(false);
watch(
	() => store.isLowCredits,
	(isLow, wasLow) => {
		// Only reset dismissal when transitioning INTO low-credits state
		// (e.g. from >10% to <=10%). Subsequent push updates within the
		// low-credits zone should not re-show a dismissed banner.
		if (isLow && !wasLow) {
			creditBannerDismissed.value = false;
		}
	},
);
const showCreditBanner = computed(() => store.isLowCredits && !creditBannerDismissed.value);

// --- Chat input ref for auto-focus ---
const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);

onMounted(() => {
	void nextTick(() => chatInputRef.value?.focus());
});

function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	// Capture the placeholder thread id before send. After the send completes
	// and syncThread persists it, navigate to the thread route so the URL
	// reflects the active conversation and the sidebar highlights it.
	const threadId = store.currentThreadId;
	void store.sendMessage(message, attachments, rootStore.pushRef).then(() => {
		if (store.threads.some((t) => t.id === threadId)) {
			void router.replace({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId },
			});
		}
	});
}

function handleStop() {
	void store.cancelRun();
}

function goToSettings() {
	void router.push({ name: INSTANCE_AI_SETTINGS_VIEW });
}
</script>

<template>
	<div :class="$style.chatArea">
		<!-- Header -->
		<div :class="$style.header">
			<Transition name="sidebar-toggle-fade">
				<span v-if="sidebar.collapsed.value" :class="$style.sidebarToggle">
					<N8nTooltip
						:content="i18n.baseText('instanceAi.sidebar.chatHistory')"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nIconButton
							icon="history"
							variant="ghost"
							size="small"
							icon-size="large"
							data-test-id="instance-ai-sidebar-toggle"
							:aria-label="i18n.baseText('instanceAi.sidebar.chatHistory')"
							@click="sidebar.toggle"
						/>
					</N8nTooltip>
				</span>
			</Transition>
			<div :class="$style.headerActions">
				<CreditsSettingsDropdown
					v-if="store.creditsRemaining !== undefined"
					:credits-remaining="store.creditsRemaining"
					:credits-quota="store.creditsQuota"
					:is-low-credits="store.isLowCredits"
					@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
				/>
				<N8nIconButton
					icon="cog"
					variant="ghost"
					size="small"
					icon-size="large"
					data-test-id="instance-ai-settings-button"
					@click="goToSettings"
				/>
			</div>
		</div>

		<N8nCallout
			v-if="isReadOnlyEnvironment"
			theme="warning"
			icon="lock"
			:class="$style.readOnlyBanner"
		>
			{{ i18n.baseText('readOnlyEnv.instanceAi.notice') }}
		</N8nCallout>

		<div :class="$style.contentArea">
			<div :class="$style.emptyLayout">
				<InstanceAiEmptyState />
				<div :class="$style.centeredInput">
					<InstanceAiStatusBar />
					<CreditWarningBanner
						v-if="showCreditBanner"
						:credits-remaining="store.creditsRemaining"
						:credits-quota="store.creditsQuota"
						@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
						@dismiss="creditBannerDismissed = true"
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

.header {
	padding: var(--spacing--2xs) var(--spacing--xs);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	background-color: var(--color--background--light-2);
}

.readOnlyBanner {
	margin: var(--spacing--xs) var(--spacing--sm) 0;
}

.headerActions {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.sidebarToggle {
	display: inline-flex;
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

<style lang="scss">
// Entry-point icon button: fade in slightly after the sidebar has begun
// collapsing, fade out quickly when the sidebar starts opening — so the
// crossover feels intentional rather than abrupt.
.sidebar-toggle-fade-enter-from,
.sidebar-toggle-fade-leave-to {
	opacity: 0;
}

.sidebar-toggle-fade-enter-active {
	transition: opacity 0.15s ease;
}

.sidebar-toggle-fade-leave-active {
	transition: opacity 0.1s ease;
}
</style>
