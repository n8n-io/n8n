<script setup lang="ts">
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { CHAT_CONVERSATION_VIEW } from '@/features/chatHub/constants';
import { PROVIDER_CREDENTIAL_TYPE_MAP, type ChatHubSessionDto } from '@n8n/api-types';
import { N8nActionDropdown, N8nIcon, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
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
	<div :class="[$style.menuItem, { [$style.active]: active }]">
		<N8nInput
			v-if="isRenaming"
			size="small"
			ref="input"
			v-model="editedLabel"
			@blur="handleBlur"
			@keydown="handleKeyDown"
		/>
		<template v-else>
			<RouterLink
				:to="{ name: CHAT_CONVERSATION_VIEW, params: { id: session.id } }"
				:class="$style.menuItemLink"
			>
				<N8nIcon v-if="session.provider === null" size="medium" icon="message-circle" />
				<CredentialIcon
					v-else
					:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[session.provider]"
					:size="16"
				/>
				<N8nText :class="$style.label">{{ session.title }}</N8nText>
			</RouterLink>
			<N8nActionDropdown
				:items="dropdownItems"
				:class="$style.actionDropdown"
				placement="bottom-start"
				@select="handleActionSelect"
				@click.stop
			>
				<template #activator>
					<N8nIconButton
						icon="ellipsis-vertical"
						type="tertiary"
						text
						:class="$style.actionDropdownTrigger"
					/>
				</template>
			</N8nActionDropdown>
		</template>
	</div>
</template>

<style lang="scss" module>
.menuItem {
	display: flex;
	align-items: center;
	border-radius: var(--spacing--4xs);
	padding-right: 0;

	&.active,
	&:hover {
		background-color: var(--color--foreground);
	}
}

.menuItemLink {
	display: flex;
	align-items: center;
	padding: var(--spacing--3xs);
	gap: var(--spacing--3xs);
	cursor: pointer;
	color: var(--color--text);
	min-width: 0;
	flex: 1;
	text-decoration: none;

	&:focus-visible {
		outline: 1px solid var(--color--secondary);
		outline-offset: -1px;
		border-radius: var(--spacing--4xs);
	}
}

.label {
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	flex: 1;
	line-height: var(--font-size--lg);
	min-width: 0;
}

.actionDropdown {
	opacity: 0;
	transition: opacity 0.2s;
	flex-shrink: 0;
	width: 0;

	.menuItem:has(:focus) &,
	.menuItem:hover &,
	.active & {
		width: auto;
		opacity: 1;
	}
}

.actionDropdownTrigger {
	box-shadow: none !important;
	outline: none !important;
}
</style>
