<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nInput, N8nPopover, N8nSpinner, N8nText } from '@n8n/design-system';
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
		connectVariant?: 'solid' | 'outline';
		teleported?: boolean;
	}>(),
	{
		connectVariant: 'solid',
		teleported: false,
	},
);

const emit = defineEmits<{
	'select-credential': [item: ToolConnectionItem, authType: string, credentialId: string];
	'credential-dropdown-open': [item: ToolConnectionItem];
	'first-credential-connect': [item: ToolConnectionItem];
	'new-credential-connect': [item: ToolConnectionItem];
}>();

const i18n = useI18n();

const adapter = inject(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, null);

const isOpen = ref(false);
const searchQuery = ref('');
const searchInputRef = ref<InstanceType<typeof N8nInput> | null>(null);

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

const filteredCredentials = computed(() => {
	const query = searchQuery.value.trim().toLowerCase();
	if (!query) return availableCredentials.value;
	return availableCredentials.value.filter((cred) => cred.name.toLowerCase().includes(query));
});

watch(isOpen, (open) => {
	if (open) {
		emit('credential-dropdown-open', props.item);
		searchQuery.value = '';
		void nextTick(() => {
			(searchInputRef.value?.$el as HTMLElement | undefined)
				?.querySelector('input')
				?.focus({ preventScroll: true });
		});
	}
});

function pickCredential(authType: string, credentialId: string) {
	emit('select-credential', props.item, authType, credentialId);
	isOpen.value = false;
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
	<N8nPopover
		v-else-if="
			hasToolConnection(item.status) ||
			availableCredentials.length > 0 ||
			creatableCredentials.length > 1
		"
		v-model:open="isOpen"
		side="bottom"
		align="end"
		:side-offset="6"
		:width="'260px'"
		:teleported="teleported"
		:z-index="2000"
		data-test-id="tool-credential-picker"
	>
		<template #trigger>
			<N8nButton
				v-if="item.status === 'disconnected'"
				variant="outline"
				size="small"
				data-test-id="tool-credential-picker-trigger-disconnected"
			>
				<N8nIcon
					icon="circle-x"
					:size="14"
					:class="$style.statusIconDisconnected"
					aria-hidden="true"
				/>
				<span>{{ statusLabel }}</span>
				<N8nIcon icon="chevron-down" :size="12" />
			</N8nButton>
			<button
				v-else-if="hasToolConnection(item.status)"
				type="button"
				:class="$style.statusPill"
				:data-test-id="`tool-credential-picker-trigger-${item.status}`"
			>
				<N8nIcon icon="check" :size="14" :class="$style.statusIconConnected" aria-hidden="true" />
				<span>{{ statusLabel }}</span>
				<N8nIcon icon="chevron-down" :size="12" />
			</button>
			<N8nButton
				v-else
				:variant="connectVariant"
				size="small"
				data-test-id="tool-credential-picker-trigger-connect"
			>
				<span>{{ i18n.baseText('tools.connection.action.connect') }}</span>
				<N8nIcon icon="chevron-down" :size="14" :class="$style.triggerCaret" />
			</N8nButton>
		</template>

		<template #content>
			<div :class="$style.searchWrapper">
				<N8nInput
					ref="searchInputRef"
					v-model="searchQuery"
					size="small"
					:placeholder="i18n.baseText('tools.connection.credentialPicker.search')"
					data-test-id="tool-credential-picker-search"
					:class="$style.searchInput"
				>
					<template #prefix>
						<N8nIcon icon="search" :size="14" />
					</template>
				</N8nInput>
			</div>
			<ul :class="$style.list" data-test-id="tool-credential-picker-list">
				<li v-if="filteredCredentials.length === 0" :class="$style.emptyRow">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('tools.connection.credentialPicker.noResults') }}
					</N8nText>
				</li>
				<li
					v-for="cred in filteredCredentials"
					:key="`${cred.authType}:${cred.id}`"
					:class="$style.row"
					data-test-id="tool-credential-picker-row"
					:data-credential-id="cred.id"
					:data-auth-type="cred.authType"
					@click="pickCredential(cred.authType, cred.id)"
				>
					<span :class="$style.rowLabel">
						{{ cred.name }}
						<small
							v-if="creatableCredentials.length > 1 && cred.authDisplayName"
							:class="$style.authLabel"
						>
							{{ cred.authDisplayName }}
						</small>
					</span>
					<span :class="$style.rowActions">
						<span :class="$style.rowCheck" aria-hidden="true">
							<N8nIcon v-if="selectedCredentialIds.includes(cred.id)" icon="check" :size="14" />
						</span>
						<button
							type="button"
							:class="$style.rowEdit"
							:title="i18n.baseText('generic.edit')"
							:aria-label="i18n.baseText('generic.edit')"
							data-test-id="tool-credential-picker-edit"
							@click.stop="editCredential(cred.id)"
						>
							<N8nIcon icon="square-pen" :size="14" />
						</button>
					</span>
				</li>
			</ul>
			<button
				v-if="creatableCredentials[0]"
				type="button"
				:class="$style.createRow"
				data-test-id="tool-credential-picker-create"
				@click="createCredential(creatableCredentials[0].authType, 'dropdown')"
			>
				<N8nIcon icon="plus" :size="14" />
				<span>{{ i18n.baseText('tools.connection.credentialPicker.create') }}</span>
			</button>
		</template>
	</N8nPopover>
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

.statusMarker,
.statusPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
}

.statusPill {
	background: none;
	border: 0;
	cursor: pointer;
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

.searchWrapper {
	padding: var(--spacing--2xs);
}

.searchInput {
	width: 100%;
}

.list {
	list-style: none;
	padding: 0 var(--spacing--4xs) var(--spacing--4xs);
	margin: 0;
	max-height: 260px;
	overflow-y: auto;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	cursor: pointer;
	border-radius: var(--radius--2xs);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	transition: background-color 80ms ease;

	&:hover {
		background: var(--color--background--light-1);

		.rowEdit {
			opacity: 1;
			pointer-events: auto;
			color: var(--color--text);
		}
	}
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

.rowActions {
	margin-left: auto;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.rowCheck {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--color--text--tint-1);
}

.rowEdit {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: 0;
	opacity: 0;
	background: none;
	pointer-events: none;
	color: var(--color--text--tint-1);
	cursor: pointer;
}

.emptyRow {
	padding: var(--spacing--2xs);
	text-align: center;
}

.createRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--xs);
	border-top: 1px solid var(--color--foreground);
	background: none;
	border-left: 0;
	border-right: 0;
	border-bottom: 0;
	color: var(--color--text);
	border-bottom-left-radius: var(--radius--2xs);
	border-bottom-right-radius: var(--radius--2xs);
	cursor: pointer;
	text-align: left;

	&:hover {
		background: var(--color--background--light-1);
	}
}
</style>
