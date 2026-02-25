<script lang="ts" setup>
import { nextTick, ref, watch, onMounted } from 'vue';
import { N8nScrollArea, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useInstanceAiStore } from './instanceAi.store';
import InstanceAiMessage from './components/InstanceAiMessage.vue';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiThreadList from './components/InstanceAiThreadList.vue';

const store = useInstanceAiStore();
const i18n = useI18n();
const documentTitle = useDocumentTitle();
const scrollableRef = ref<HTMLElement | null>(null);

documentTitle.set('Instance AI');

onMounted(() => {
	// Initialize with a default thread if none exist
	if (store.threads.length === 0) {
		store.threads.push({
			id: store.currentThreadId,
			title: 'New conversation',
			createdAt: new Date().toISOString(),
		});
	}
});

async function handleSubmit(message: string) {
	await store.sendMessage(message);
}

function handleStop() {
	store.stopStreaming();
}

// Auto-scroll to bottom when messages update
watch(
	() => store.messages.length,
	async () => {
		await nextTick();
		if (scrollableRef.value) {
			scrollableRef.value.scrollTop = scrollableRef.value.scrollHeight;
		}
	},
);

// Also scroll on streaming content changes
watch(
	() => {
		const last = store.messages[store.messages.length - 1];
		return last?.content?.length ?? 0;
	},
	async () => {
		await nextTick();
		if (scrollableRef.value) {
			scrollableRef.value.scrollTop = scrollableRef.value.scrollHeight;
		}
	},
);
</script>

<template>
	<div :class="$style.container">
		<!-- Thread list sidebar -->
		<div :class="$style.sidebar">
			<InstanceAiThreadList />
		</div>

		<!-- Main chat area -->
		<div :class="$style.chatArea">
			<!-- Header -->
			<div :class="$style.header">
				<N8nText tag="h2" size="large" bold>
					{{ i18n.baseText('instanceAi.view.title') }}
				</N8nText>
			</div>

			<!-- Messages -->
			<N8nScrollArea :class="$style.scrollArea">
				<div ref="scrollableRef" :class="$style.messageList">
					<div v-if="!store.hasMessages" :class="$style.emptyState">
						<N8nText size="medium" color="text-light">
							{{ i18n.baseText('instanceAi.view.subtitle') }}
						</N8nText>
					</div>
					<InstanceAiMessage
						v-for="message in store.messages"
						:key="message.id"
						:message="message"
					/>
				</div>
			</N8nScrollArea>

			<!-- Input -->
			<InstanceAiInput
				:is-streaming="store.isStreaming"
				@submit="handleSubmit"
				@stop="handleStop"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	height: 100%;
	width: 100%;
	overflow: hidden;
}

.sidebar {
	width: 260px;
	min-width: 200px;
	flex-shrink: 0;
}

.chatArea {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
}

.header {
	padding: var(--spacing--sm) var(--spacing--lg);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.scrollArea {
	flex: 1;
	overflow-y: auto;
}

.messageList {
	max-width: 800px;
	margin: 0 auto;
	padding: var(--spacing--sm) var(--spacing--lg);
}

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 300px;
}
</style>
