<script setup lang="ts">
import type { ActionDropdownItem } from '@n8n/design-system';
import { useDropdownSearch } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import ChatHistoryDropdown from '@/features/ai/shared/components/ChatHistoryDropdown.vue';

import { useAgentSessionsStore } from '../agentSessions.store';

interface SessionOption {
	id: string;
	title: string;
	disabled?: boolean;
	label?: string;
	updatedAt?: string;
}

const props = withDefaults(
	defineProps<{
		sessionOptions: SessionOption[];
		canDeleteSession?: boolean;
		isDeletingSession?: boolean;
	}>(),
	{ canDeleteSession: false, isDeletingSession: false },
);

const emit = defineEmits<{
	select: [sessionId: string];
	delete: [sessionId: string];
}>();

defineSlots<{ trigger: () => unknown }>();

const i18n = useI18n();
const sessionsStore = useAgentSessionsStore();
const deleteActions: Array<ActionDropdownItem<string>> = [
	{
		id: 'delete',
		label: i18n.baseText('agentSessions.delete'),
		icon: 'trash-2',
		variant: 'destructive',
	},
];
const items = computed(() =>
	props.sessionOptions.map((option) => ({
		id: option.id,
		label: option.label ?? option.title,
		disabled: option.disabled,
		data: {
			fullTitle: option.title,
			updatedAt: option.updatedAt,
			actions: !option.disabled && props.canDeleteSession ? deleteActions : undefined,
		},
	})),
);
const { search, filteredItems, handleSearch } = useDropdownSearch(items, {
	isSearchable: (item) => !item.disabled,
	searchFields: (item) => [item.label, item.data?.fullTitle],
});
const emptyText = computed(() =>
	i18n.baseText(
		search.value.trim()
			? 'agents.builder.chat.sessionPicker.noMatch'
			: 'agents.builder.chat.sessionPicker.empty',
	),
);

function requestDeletion(actionId: string, sessionId: string) {
	if (actionId !== 'delete' || !props.canDeleteSession || props.isDeletingSession) return;
	emit('delete', sessionId);
}
</script>

<template>
	<ChatHistoryDropdown
		:items="filteredItems"
		:search-placeholder="i18n.baseText('agents.builder.chat.sessionPicker.searchPlaceholder')"
		:empty-text="emptyText"
		:loading="sessionsStore.loading"
		:action-button-label="i18n.baseText('agentSessions.actions')"
		:actions-disabled="props.isDeletingSession"
		content-test-id="agent-preview-session-list"
		data-test-id="agent-preview-session-switcher"
		@search="handleSearch"
		@select="emit('select', $event)"
		@action="requestDeletion"
	>
		<template #trigger>
			<slot name="trigger" />
		</template>
	</ChatHistoryDropdown>
</template>
