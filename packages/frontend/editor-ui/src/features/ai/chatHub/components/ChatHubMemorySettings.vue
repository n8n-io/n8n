<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useRootStore } from '@n8n/stores/useRootStore';
import { N8nActionToggle, N8nButton, N8nInputLabel, N8nText } from '@n8n/design-system';
import { useChatStore } from '../chat.store';
import { clearAllMemoryApi, deleteMemoryFactApi } from '../chat.api';

const i18n = useI18n();
const { showError } = useToast();
const { confirm } = useMessage();
const rootStore = useRootStore();
const chatStore = useChatStore();

const memoryFacts = computed(() => {
	return chatStore.memory
		.split('\n')
		.map((f) => f.trim())
		.filter((f) => f.length > 0);
});

const rowActions = computed(() => [
	{ label: i18n.baseText('settings.chatHub.memory.action.delete'), value: 'delete' },
]);

async function fetchMemory() {
	try {
		await chatStore.fetchAllChatSettings();
	} catch (error) {
		showError(error, i18n.baseText('settings.chatHub.providers.fetching.error'));
	}
}

async function onMemoryRowAction(_action: string, index: number) {
	await onDeleteMemoryFact(index);
}

async function onDeleteMemoryFact(index: number) {
	try {
		await deleteMemoryFactApi(rootStore.restApiContext, index);
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
	<div :class="$style.container">
		<div :class="$style.titleRow">
			<div :class="$style.header">
				<N8nInputLabel :label="i18n.baseText('settings.personal.chatHubMemory')" />
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.chatHub.memory.description') }}
				</N8nText>
			</div>
			<N8nButton
				v-if="memoryFacts.length > 0"
				size="small"
				variant="subtle"
				icon="trash"
				icon-only
				:title="i18n.baseText('settings.chatHub.memory.clearAll')"
				@click="onClearAllMemory"
			/>
		</div>
		<div v-if="memoryFacts.length === 0" :class="$style.empty">
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('settings.chatHub.memory.empty') }}
			</N8nText>
		</div>
		<ul v-else :class="$style.list">
			<li v-for="(fact, index) in memoryFacts" :key="index" :class="$style.row">
				<N8nText size="small" :class="$style.fact">{{ fact }}</N8nText>
				<N8nActionToggle
					placement="bottom"
					:actions="rowActions"
					theme="dark"
					@action="onMemoryRowAction($event, index)"
				/>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.titleRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.empty {
	padding: var(--spacing--sm) 0;
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

.fact {
	flex: 1;
	min-width: 0;
	overflow-wrap: break-word;
}
</style>
