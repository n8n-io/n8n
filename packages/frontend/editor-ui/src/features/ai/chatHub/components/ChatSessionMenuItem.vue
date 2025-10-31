<script setup lang="ts">
import { unflattenModel } from '@/features/ai/chatHub/chat.utils';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import ChatSidebarLink from '@/features/ai/chatHub/components/ChatSidebarLink.vue';
import { useAgent } from '@/features/ai/chatHub/composables/useAgent';
import { CHAT_CONVERSATION_VIEW } from '@/features/ai/chatHub/constants';
import { type ChatHubSessionDto } from '@n8n/api-types';
import { N8nInput } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

const { session, isRenaming, active } = defineProps<{
	session: ChatHubSessionDto;
	isRenaming: boolean;
	active: boolean;
}>();

const emit = defineEmits<{
	startRename: [sessionId: string];
	cancelRename: [];
	confirmRename: [sessionId: string, newLabel: string];
	delete: [sessionId: string];
}>();

const input = useTemplateRef('input');
const editedLabel = ref('');

type SessionAction = 'rename' | 'delete';

const model = computed(() => unflattenModel(session));
const agent = useAgent(model);

const dropdownItems = computed<Array<ActionDropdownItem<SessionAction>>>(() => [
	{
		id: 'rename',
		label: 'Rename',
		icon: 'pencil',
	},
	{
		id: 'delete',
		label: 'Delete',
		icon: 'trash-2',
	},
]);

function handleActionSelect(action: SessionAction) {
	if (action === 'rename') {
		editedLabel.value = session.title;
		emit('startRename', session.id);
	} else if (action === 'delete') {
		emit('delete', session.id);
	}
}

function handleBlur() {
	const trimmed = editedLabel.value.trim();

	if (trimmed && trimmed !== session.title) {
		emit('confirmRename', session.id, trimmed);
	} else {
		emit('cancelRename');
	}
}

function handleKeyDown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		emit('cancelRename');
		return;
	}

	if (e.key === 'Enter') {
		handleBlur();
	}
}

watch(
	() => isRenaming,
	async (renaming) => {
		if (renaming) {
			editedLabel.value = session.title;
			await nextTick();
			input.value?.focus();
			input.value?.select();
		} else {
			editedLabel.value = '';
		}
	},
	{ immediate: true },
);
</script>

<template>
	<ChatSidebarLink
		:to="{ name: CHAT_CONVERSATION_VIEW, params: { id: session.id } }"
		:active="active"
		:menu-items="dropdownItems"
		:label="session.title"
		@action-select="handleActionSelect"
	>
		<template v-if="isRenaming" #default>
			<N8nInput
				size="small"
				ref="input"
				v-model="editedLabel"
				@blur="handleBlur"
				@keydown="handleKeyDown"
			/>
		</template>
		<template #icon>
			<ChatAgentAvatar :agent="agent ?? null" size="sm" />
		</template>
	</ChatSidebarLink>
</template>
