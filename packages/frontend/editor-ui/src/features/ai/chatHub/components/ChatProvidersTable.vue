<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { WorkflowListItem, UserAction } from '@/Interface';
import { type TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import {
	N8nActionBox,
	N8nActionToggle,
	N8nButton,
	N8nDataTableServer,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { VIEWS } from '@/app/constants';
import router from '@/app/router';
import {
	ChatHubLLMProvider,
	ChatHubProvider,
	ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { CHAT_CREDENTIAL_SELECTOR_MODAL_KEY } from '../constants';

type Props = {
	providers: ChatProviderSettingsDto[];
	loading: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	editProvider: [provider: ChatProviderSettingsDto];
	refresh: [];
}>();

const uiStore = useUIStore();
const i18n = useI18n();

const tableHeaders = ref<Array<TableHeader<ChatProviderSettingsDto>>>([
	{
		title: i18n.baseText('settings.chatHub.providers.table.provider'),
		key: 'provider',
		width: 150,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.chatHub.providers.table.models'),
		key: 'models',
		width: 200,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.chatHub.providers.table.createdAt'),
		key: 'createdAt',
		width: 350,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.chatHub.providers.table.updatedAt'),
		key: 'updatedAt',
		width: 350,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 50,
		disableSort: true,
		value() {
			return;
		},
	},
]);

const tableActions = ref<Array<UserAction<WorkflowListItem>>>([
	{
		label: i18n.baseText('settings.chatHub.providers.table.action.editProvider'),
		value: 'editProvider',
	},
]);

const onTableAction = (action: string, provider: ChatProviderSettingsDto) => {
	switch (action) {
		case 'editProvider':
			emit('editProvider', provider);
			break;
		default:
			break;
	}
};

function handleSelectCredentials(provider: ChatHubProvider, id: string) {
	console.log('selectCredential', provider, id);
}

function handleCreateNewCredential(provider: ChatHubLLMProvider) {
	const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];
	uiStore.openNewCredential(credentialType);
}

const onAddProvider = () => {
	console.log('Navigating to add provider');
	uiStore.openModalWithData({
		name: CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
		data: {
			provider: 'openai',
			initialValue: null,
			onSelect: handleSelectCredentials,
			onCreateNew: handleCreateNewCredential,
		},
	});
};
</script>

<template>
	<div :class="$style['table-container']">
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" class="mb-l" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else class="mt-s mb-xl">
			<div :class="[$style.header, 'mb-s']">
				<N8nHeading size="medium" :bold="true">
					{{ i18n.baseText('settings.chatHub.providers.table.title') }}
				</N8nHeading>
				<div :class="$style.actions">
					<N8nTooltip :content="i18n.baseText('settings.chatHub.providers.table.refresh.tooltip')">
						<N8nButton
							data-test-id="chat-providers-refresh-button"
							size="small"
							type="tertiary"
							icon="refresh-cw"
							:square="true"
							@click="$emit('refresh')"
						/>
					</N8nTooltip>
					<N8nButton
						data-test-id="chat-providers-add-provider-button"
						size="small"
						type="primary"
						@click="onAddProvider"
					>
						{{ i18n.baseText('settings.chatHub.providers.table.addProvider.button') }}
					</N8nButton>
				</div>
			</div>
			<N8nActionBox
				v-if="props.providers.length === 0"
				data-test-id="empty-provider-list-box"
				:heading="i18n.baseText('settings.chatHub.providers.table.empty.title')"
				:description="i18n.baseText('settings.chatHub.providers.table.empty.description')"
			/>
			<N8nDataTableServer
				v-else
				:class="$style['chat-providers-table']"
				data-test-id="chat-providers-table"
				:headers="tableHeaders"
				:items="props.providers"
				:items-length="props.providers.length"
			>
				<template #[`item.provider`]="{ item }">
					<div :class="$style['provider-cell']" data-test-id="chat-provider-cell">
						<span>
							<N8nText data-test-id="chat-provider-name">
								{{ item.provider }}
							</N8nText>
						</span>
					</div>
				</template>
				<template #[`item.models`]="{ item }">
					<span>
						<N8nText data-test-id="chat-provider-name">
							{{ item.allowedModels.join(', ') }}
						</N8nText>
					</span>
				</template>
				<template #[`item.createdAt`]="{ item }">
					<span>
						<N8nText data-test-id="chat-provider-name">
							{{ item.createdAt }}
						</N8nText>
					</span>
				</template>
				<template #[`item.updatedAt`]="{ item }">
					<span>
						<N8nText data-test-id="chat-provider-name">
							{{ item.updatedAt ?? '-' }}
						</N8nText>
					</span>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						data-test-id="chat-provider-action-toggle"
						placement="bottom"
						:actions="tableActions"
						theme="dark"
						@action="onTableAction($event, item)"
					/>
				</template>
			</N8nDataTableServer>
		</div>
	</div>
</template>

<style module lang="scss">
.table-container {
	:global(.table-pagination) {
		display: none;
	}
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.chat-providers-table {
	tr:last-child {
		border-bottom: none !important;
	}
}

.provider-cell {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);

	.separator,
	.ellipsis {
		padding-bottom: 1px;
		color: var(--color--text--tint-1);
	}
}
</style>
