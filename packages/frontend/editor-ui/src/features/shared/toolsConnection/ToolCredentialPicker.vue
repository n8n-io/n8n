<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nInput, N8nPopover, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	type ToolConnectionItem,
	type ToolCredentialRef,
} from './types';

const props = defineProps<{
	item: ToolConnectionItem;
	credentials: ToolCredentialRef[];
}>();

const emit = defineEmits<{
	'select-credential': [item: ToolConnectionItem, authType: string, credentialId: string];
}>();

const i18n = useI18n();

const adapter = inject(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, null);

const isOpen = ref(false);
const searchQuery = ref('');
const searchInputRef = ref<InstanceType<typeof N8nInput> | null>(null);

const selectedCredentialIds = computed(() =>
	props.credentials.map((c) => c.credentialId).filter((id): id is string => Boolean(id)),
);

const isConnected = computed(() => selectedCredentialIds.value.length > 0);

const availableCredentials = computed(() => {
	if (!adapter) return [];
	return props.credentials.flatMap((cred) =>
		adapter.getCredentialsByType(cred.authType).map((c) => ({
			id: c.id,
			name: c.name,
			authType: cred.authType,
		})),
	);
});

const filteredCredentials = computed(() => {
	const query = searchQuery.value.trim().toLowerCase();
	if (!query) return availableCredentials.value;
	return availableCredentials.value.filter((cred) => cred.name.toLowerCase().includes(query));
});

watch(isOpen, (open) => {
	if (open) {
		searchQuery.value = '';
		void nextTick(() => {
			(searchInputRef.value?.$el as HTMLElement | undefined)?.querySelector('input')?.focus();
		});
	}
});

function pickCredential(authType: string, credentialId: string) {
	emit('select-credential', props.item, authType, credentialId);
	isOpen.value = false;
}

const createAuthType = computed(
	() => props.credentials.find((c) => c.required)?.authType ?? props.credentials[0]?.authType,
);

function createCredential() {
	if (!createAuthType.value) return;
	adapter?.openNewCredential(createAuthType.value);
	isOpen.value = false;
}
</script>

<template>
	<N8nPopover
		v-model:open="isOpen"
		side="bottom"
		align="end"
		:side-offset="6"
		:width="'260px'"
		:teleported="false"
		:z-index="2000"
		data-test-id="tool-credential-picker"
	>
		<template #trigger>
			<button
				v-if="isConnected"
				type="button"
				:class="$style.connectedPill"
				data-test-id="tool-credential-picker-trigger-connected"
			>
				<span :class="$style.statusDot" aria-hidden="true" />
				<span>{{ i18n.baseText('tools.connection.action.connected') }}</span>
				<N8nIcon icon="chevron-down" :size="12" />
			</button>
			<N8nButton
				v-else
				variant="solid"
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
					:class="[$style.row, { [$style.rowActive]: selectedCredentialIds.includes(cred.id) }]"
					data-test-id="tool-credential-picker-row"
					:data-credential-id="cred.id"
					:data-auth-type="cred.authType"
					@click="pickCredential(cred.authType, cred.id)"
				>
					<span :class="$style.rowLabel">{{ cred.name }}</span>
					<N8nIcon
						v-if="selectedCredentialIds.includes(cred.id)"
						icon="check"
						:size="14"
						:class="$style.rowCheck"
					/>
				</li>
			</ul>
			<button
				v-if="createAuthType"
				type="button"
				:class="$style.createRow"
				data-test-id="tool-credential-picker-create"
				@click="createCredential"
			>
				<N8nIcon icon="plus" :size="14" />
				<span>{{ i18n.baseText('tools.connection.credentialPicker.create') }}</span>
			</button>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.triggerCaret {
	margin-left: var(--spacing--4xs);
}

.connectedPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	background: none;
	border: 0;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	cursor: pointer;
	border-radius: var(--border-radius--base);
	white-space: nowrap;

	&:hover {
		background: var(--color--background--light-2);
	}
}

.statusDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--color--success);
	flex-shrink: 0;
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
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--2xs);
	cursor: pointer;
	border-radius: var(--border-radius--base);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	transition: background-color 80ms ease;

	&:hover {
		background: var(--color--background--light-2);
	}
}

.rowActive {
	color: var(--color--text);
	font-weight: var(--font-weight--medium);
}

.rowLabel {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.rowCheck {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
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
	padding: var(--spacing--2xs);
	border-top: 1px solid var(--color--foreground);
	background: none;
	border-left: 0;
	border-right: 0;
	border-bottom: 0;
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	cursor: pointer;
	text-align: left;

	&:hover {
		background: var(--color--background--light-2);
	}
}
</style>
