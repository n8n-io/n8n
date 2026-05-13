<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { N8nIconButton, N8nResizeWrapper, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDebounce } from '@/app/composables/useDebounce';
import InstanceAiThreadView from '@/features/ai/instanceAi/InstanceAiThreadView.vue';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { useWorkflowChatPanelStore } from './workflowChatPanel.store';
import { useWorkflowContext } from './useWorkflowContext';

const panelStore = useWorkflowChatPanelStore();
const instanceAiStore = useInstanceAiStore();
const i18n = useI18n();
const { snapshot } = useWorkflowContext();
const isInitialized = ref(false);

const width = computed(() => panelStore.width);

async function initializeThread(): Promise<void> {
	if (isInitialized.value) return;

	let threadId = panelStore.threadId;
	if (!threadId) {
		threadId = uuidv4();
		panelStore.setThreadId(threadId);
	}

	// Register the workflow-context provider BEFORE the thread view mounts so
	// the very first sendMessage sees the snapshot. Read at send time, so it
	// always reflects the current editor state, not a stale cache.
	instanceAiStore.createWorkflowChatRuntime(threadId, {
		getWorkflowContext: () => snapshot(),
	});

	// Lazy-create the thread on the backend so the SSE / chat endpoints have
	// somewhere to write. Idempotent — re-opens are cheap.
	await instanceAiStore.syncThread(threadId);
	isInitialized.value = true;
}

watch(
	() => panelStore.isOpen,
	async (isOpen) => {
		if (isOpen) await initializeThread();
	},
);

onMounted(async () => {
	if (panelStore.isOpen) await initializeThread();
});

function onResize(data: { width: number }) {
	panelStore.updateWidth(data.width);
}

function onResizeDebounced(data: { direction: string; x: number; width: number }) {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
}

function onClose() {
	panelStore.close();
}
</script>

<template>
	<Transition
		:enter-active-class="$style.slideEnterActive"
		:enter-from-class="$style.slideFrom"
		:leave-active-class="$style.slideLeaveActive"
		:leave-to-class="$style.slideFrom"
	>
		<div
			v-show="panelStore.isOpen"
			:class="$style.slideWrapper"
			:style="{ width: `${width}px` }"
			data-test-id="workflow-chat-panel"
		>
			<N8nResizeWrapper
				:supported-directions="['left']"
				:width="width"
				:min-width="panelStore.MIN_WIDTH"
				:max-width="panelStore.MAX_WIDTH"
				:class="$style.resizeWrapper"
				@resize="onResizeDebounced"
			>
				<div :style="{ width: `${width}px` }" :class="$style.wrapper">
					<div :class="$style.header">
						<N8nText size="medium" bold>{{ i18n.baseText('workflowChat.panel.title') }}</N8nText>
						<N8nIconButton
							icon="x"
							type="tertiary"
							size="small"
							:title="i18n.baseText('workflowChat.toggle.tooltip')"
							@click="onClose"
						/>
					</div>
					<div :class="$style.content">
						<InstanceAiThreadView v-if="panelStore.threadId" :thread-id="panelStore.threadId" />
					</div>
				</div>
			</N8nResizeWrapper>
		</div>
	</Transition>
</template>

<style lang="scss" module>
.slideWrapper {
	overflow: hidden;
	height: 100%;
}

.slideEnterActive {
	transition: width 200ms ease-in-out;
}

.slideLeaveActive {
	transition: width 200ms ease-in-out;
}

.slideFrom {
	width: 0 !important;
}

.resizeWrapper {
	z-index: var(--ask-assistant-chat--z);
	height: 100%;
}

.wrapper {
	height: 100%;
	display: flex;
	flex-direction: column;
	background: var(--color--background--light-2);
	border-left: var(--border--base);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--md) var(--spacing--md);
	border-bottom: var(--border--base);
}

.content {
	flex: 1;
	overflow: hidden;
}
</style>
