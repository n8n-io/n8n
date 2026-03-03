<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useRootStore } from '@n8n/stores/useRootStore';
import { N8nActionToggle, N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import { useChatStore } from '../chat.store';
import { clearAllMemoryApi, deleteMemoryItemApi } from '../chat.api';
import { CHAT_CONVERSATION_VIEW } from '../constants';

defineProps<{
	modalName: string;
}>();

const i18n = useI18n();
const { showError } = useToast();
const { confirm } = useMessage();
const rootStore = useRootStore();
const chatStore = useChatStore();
const router = useRouter();

const memoryItems = computed(() => chatStore.memory);

const rowActions = computed(() => [
	{
		label: i18n.baseText('settings.chatHub.memory.openConversation'),
		value: 'open-conversation',
		type: 'external-link' as const,
	},
	{ label: i18n.baseText('settings.chatHub.memory.action.delete'), value: 'delete' },
]);

async function fetchMemory() {
	try {
		await chatStore.fetchMemory();
	} catch (error) {
		showError(error, i18n.baseText('settings.chatHub.providers.fetching.error'));
	}
}

async function onMemoryRowAction(action: string, index: number) {
	if (action === 'open-conversation') {
		const sessionId = memoryItems.value[index]?.sessionId;
		if (sessionId) {
			const url = router.resolve({ name: CHAT_CONVERSATION_VIEW, params: { id: sessionId } }).href;
			window.open(url, '_blank');
		}
		return;
	}
	await onDeleteMemoryFact(index);
}

async function onDeleteMemoryFact(index: number) {
	try {
		await deleteMemoryItemApi(rootStore.restApiContext, index);
		await fetchMemory();
	} catch (error) {
		showError(error, i18n.baseText('settings.chatHub.memory.delete.error'));
	}
}

async function onClearAllMemory() {
	const confirmed = await confirm(
		i18n.baseText('settings.chatHub.memory.clearAll.confirm.message'),
		i18n.baseText('settings.chatHub.memory.clearAll.confirm.title'),
		{
			confirmButtonText: i18n.baseText('settings.chatHub.memory.clearAll.confirm.button'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (confirmed !== 'confirm') return;

	try {
		await clearAllMemoryApi(rootStore.restApiContext);
		await fetchMemory();
	} catch (error) {
		showError(error, i18n.baseText('settings.chatHub.memory.clearAll.error'));
	}
}

onMounted(fetchMemory);
</script>

<template>
	<Modal :name="modalName" width="500px">
		<template #header>
			<N8nHeading size="large" color="text-dark">
				{{ i18n.baseText('settings.chatHub.memory.title') }}
			</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nText v-if="memoryItems.length === 0" color="text-light">
					{{ i18n.baseText('settings.chatHub.memory.empty') }}
				</N8nText>
				<ul v-else :class="$style.list">
					<li v-for="(memoryItem, index) in memoryItems" :key="index" :class="$style.row">
						<N8nText :class="$style.item">{{ memoryItem.item }}</N8nText>
						<N8nActionToggle
							placement="bottom"
							:actions="rowActions"
							theme="dark"
							@action="onMemoryRowAction($event, index)"
						/>
					</li>
				</ul>
				<N8nButton
					v-if="memoryItems.length > 0"
					variant="subtle"
					icon="trash"
					:label="i18n.baseText('settings.chatHub.memory.clearAll')"
					@click="onClearAllMemory"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.list {
	list-style: none;
	padding: 0;
	margin: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}
}

.item {
	flex: 1;
	min-width: 0;
	overflow-wrap: break-word;
}
</style>
