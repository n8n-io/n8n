<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import N8nButton from '../N8nButton';
import { N8nDropdownMenu, type DropdownMenuItemProps } from '../N8nDropdownMenu';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nSpinner from '../N8nSpinner';
import N8nTooltip from '../N8nTooltip';
import { useI18n } from '@n8n/i18n';
import {
	hasToolConnection,
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	type ToolConnectionItem,
	type ToolCredentialRef,
} from './types';

const props = withDefaults(
	defineProps<{
		item: ToolConnectionItem;
		credentials: ToolCredentialRef[];
		connectVariant?: 'solid' | 'subtle';
	}>(),
	{
		connectVariant: 'solid',
	},
);

const emit = defineEmits<{
	'select-credential': [item: ToolConnectionItem, authType: string, credentialId: string];
	'credential-dropdown-open': [item: ToolConnectionItem];
	'credential-dropdown-close': [item: ToolConnectionItem];
	'first-credential-connect': [item: ToolConnectionItem];
	'new-credential-connect': [item: ToolConnectionItem];
}>();

const i18n = useI18n();

const adapter = inject(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, null);

const isOpen = ref(false);
const searchQuery = ref('');

const selectedCredentialIds = computed(() =>
	props.credentials.map((c) => c.credentialId).filter((id): id is string => Boolean(id)),
);

const availableCredentials = computed(() => {
	if (!adapter) return [];
	return props.credentials.flatMap((cred) =>
		adapter.getCredentialsByType(cred.authType).map((c) => ({
			id: c.id,
			name: c.name,
			authType: cred.authType,
			authDisplayName: cred.displayName,
		})),
	);
});

const statusLabel = computed(() => {
	if (props.item.status === 'connected') {
		return i18n.baseText('tools.connection.action.connected');
	}
	if (props.item.status === 'disconnected') {
		return i18n.baseText('tools.connection.action.reconnect');
	}
	return '';
});

type CredentialMenuData = {
	authType: string;
	credentialId: string;
	authDisplayName?: string;
};

const credentialMenuItems = computed<Array<DropdownMenuItemProps<string, CredentialMenuData>>>(
	() => {
		const query = searchQuery.value.trim().toLowerCase();
		return availableCredentials.value
			.filter((credential) => !query || credential.name.toLowerCase().includes(query))
			.map((credential) => ({
				id: `${credential.authType}:${credential.id}`,
				label: credential.name,
				testId: 'tool-credential-picker-row',
				checked: selectedCredentialIds.value.includes(credential.id),
				data: {
					authType: credential.authType,
					credentialId: credential.id,
					...(credential.authDisplayName ? { authDisplayName: credential.authDisplayName } : {}),
				},
			}));
	},
);

watch(isOpen, (open) => {
	if (open) {
		emit('credential-dropdown-open', props.item);
	} else {
		emit('credential-dropdown-close', props.item);
	}
});

function pickCredential(itemId: string) {
	const credential = credentialMenuItems.value.find((item) => item.id === itemId)?.data;
	if (!credential) return;
	emit('select-credential', props.item, credential.authType, credential.credentialId);
}

const creatableCredentials = computed(() =>
	props.credentials.filter(
		(credential, index, credentials) =>
			credentials.findIndex(({ authType }) => authType === credential.authType) === index,
	),
);

function createCredential(authType: string, source: 'direct' | 'dropdown') {
	if (!authType) return;
	if (source === 'direct') {
		emit('first-credential-connect', props.item);
	} else {
		emit('new-credential-connect', props.item);
	}
	const credentialTypes =
		creatableCredentials.value.length > 1
			? creatableCredentials.value.map((credential) => credential.authType)
			: undefined;

	adapter?.openNewCredential(authType, props.item, credentialTypes);
	isOpen.value = false;
}

function editCredential(credentialId: string) {
	adapter?.openExistingCredential(credentialId);
	isOpen.value = false;
}
</script>

<template>
	<span
		v-if="item.status === 'connecting'"
		:class="$style.statusMarker"
		data-test-id="tool-credential-picker-trigger-connecting"
	>
		<N8nSpinner size="small" />
		{{ i18n.baseText('tools.connection.action.connecting') }}
	</span>
	<N8nDropdownMenu
		v-else-if="
			hasToolConnection(item.status) ||
			availableCredentials.length > 0 ||
			creatableCredentials.length > 1
		"
		v-model="isOpen"
		:items="credentialMenuItems"
		:teleported="true"
		:search-placeholder="i18n.baseText('tools.connection.credentialPicker.search')"
		:empty-text="i18n.baseText('tools.connection.credentialPicker.noResults')"
		content-test-id="tool-credential-picker"
		placement="bottom-end"
		width="260px"
		searchable
		@search="searchQuery = $event"
		@select="pickCredential"
	>
		<template #trigger>
			<N8nButton
				v-if="item.status === 'disconnected'"
				variant="ghost"
				size="small"
				data-test-id="tool-credential-picker-trigger-disconnected"
			>
				<N8nIcon icon="circle-x" :size="14" :class="$style.statusIconDisconnected" />
				<span>{{ statusLabel }}</span>
				<N8nIcon icon="chevron-down" :size="12" />
			</N8nButton>
			<N8nButton
				v-else-if="hasToolConnection(item.status)"
				variant="ghost"
				size="small"
				:data-test-id="`tool-credential-picker-trigger-${item.status}`"
			>
				<N8nIcon icon="check" :size="14" :class="$style.statusIconConnected" />
				<span>{{ statusLabel }}</span>
			</N8nButton>
			<N8nButton
				v-else
				:variant="connectVariant"
				size="small"
				data-test-id="tool-credential-picker-trigger-connect"
			>
				<span>{{ i18n.baseText('tools.connection.action.connect') }}</span>
			</N8nButton>
		</template>

		<template #item-label="{ item, ui }">
			<span :class="[$style.rowLabel, ui.class]">
				{{ item.label }}
				<small
					v-if="creatableCredentials.length > 1 && item.data?.authDisplayName"
					:class="$style.authLabel"
				>
					{{ item.data.authDisplayName }}
				</small>
			</span>
		</template>
		<template #item-trailing="{ item, ui }">
			<N8nTooltip v-if="item.data" :content="i18n.baseText('generic.edit')" as-child>
				<N8nIconButton
					:class="[ui.class, $style.itemIcon]"
					:aria-label="i18n.baseText('generic.edit')"
					icon="square-pen"
					icon-size="medium"
					size="xsmall"
					variant="ghost"
					data-test-id="tool-credential-picker-edit"
					@click.stop="editCredential(item.data.credentialId)"
				/>
			</N8nTooltip>
		</template>
		<template #footer>
			<N8nButton
				v-if="creatableCredentials[0]"
				:class="$style.createRow"
				icon="plus"
				variant="ghost"
				data-test-id="tool-credential-picker-create"
				@click="createCredential(creatableCredentials[0].authType, 'dropdown')"
			>
				{{ i18n.baseText('tools.connection.credentialPicker.create') }}
			</N8nButton>
		</template>
	</N8nDropdownMenu>
	<N8nButton
		v-else
		:variant="connectVariant"
		size="small"
		data-test-id="tool-credential-picker-trigger-connect"
		@click="createCredential(creatableCredentials[0]?.authType ?? '', 'direct')"
	>
		<span>{{ i18n.baseText('tools.connection.action.connect') }}</span>
	</N8nButton>
</template>

<style lang="scss" module>
.triggerCaret {
	margin-left: var(--spacing--4xs);
}

.statusMarker {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
}

.itemIcon {
	opacity: 0;
	pointer-events: none;
	color: var(--text-color--subtle);
}

:global([role='menuitem']:hover) .itemIcon,
:global([role='menuitem'][aria-selected='true']) .itemIcon {
	opacity: 1;
	pointer-events: auto;
}

.statusIconConnected,
.statusIconDisconnected {
	flex-shrink: 0;
}

.statusIconConnected {
	color: var(--color--success);
}

.statusIconDisconnected {
	color: var(--color--danger);
}

.rowLabel {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.authLabel {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
}

.createRow {
	width: 100%;
	justify-content: flex-start;
	border-top: 1px solid var(--border-color);
	border-radius: 0;
	height: var(--height--xl);
}
</style>
