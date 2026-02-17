<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { type TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import {
	N8nActionBox,
	N8nActionToggle,
	N8nButton,
	N8nDataTableServer,
	N8nHeading,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import {
	type ChatHubLLMProvider,
	type ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { providerDisplayNames } from '../constants';
import TimeAgo from '@/app/components/TimeAgo.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';

const TRUNCATE_MODELS_AFTER = 4;

type Props = {
	settings: Record<ChatHubLLMProvider, ChatProviderSettingsDto> | null;
	loading: boolean;
	disabled: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	editProvider: [provider: ChatProviderSettingsDto];
	refresh: [];
}>();

const i18n = useI18n();

const tableHeaders = ref<Array<TableHeader<ChatProviderSettingsDto>>>([
	{
		title: i18n.baseText('settings.chatHub.providers.table.provider'),
		key: 'provider',
		width: 120,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.chatHub.providers.table.models'),
		key: 'models',
		width: 300,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.chatHub.providers.table.updatedAt'),
		key: 'updatedAt',
		disableSort: true,
		width: 80,
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

const tableActions = computed(() => [
	{
		label: i18n.baseText('settings.chatHub.providers.table.action.editProvider'),
		value: 'editProvider',
		disabled: props.disabled,
	},
]);

const settingItems = computed(() => {
	return props.settings ? Object.values(props.settings) : [];
});

const modelsText = (settings: ChatProviderSettingsDto) => {
	if (!settings.enabled) {
		return i18n.baseText('settings.chatHub.providers.table.models.disabled');
	} else if (settings.allowedModels.length === 0) {
		return i18n.baseText('settings.chatHub.providers.table.models.allModels');
	} else {
		if (settings.allowedModels.length > TRUNCATE_MODELS_AFTER) {
			return (
				settings.allowedModels
					.slice(0, TRUNCATE_MODELS_AFTER)
					.map((m) => m.displayName)
					.join(', ') +
				i18n.baseText('settings.chatHub.providers.table.models.more', {
					interpolate: {
						count: settings.allowedModels.length - TRUNCATE_MODELS_AFTER,
					},
				})
			);
		}
		return settings.allowedModels.map((m) => m.displayName).join(', ');
	}
};

const onTableAction = (action: string, settings: ChatProviderSettingsDto) => {
	switch (action) {
		case 'editProvider':
			emit('editProvider', settings);
			break;
		default:
			break;
	}
};
</script>

<template>
	<div :class="$style.tableContainer">
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" :class="$style.header" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else :class="$style.container">
			<div :class="$style.header">
				<N8nHeading size="medium" :bold="true">
					{{ i18n.baseText('settings.chatHub.providers.table.title') }}
				</N8nHeading>
				<div :class="$style.actions">
					<N8nTooltip :content="i18n.baseText('settings.chatHub.providers.table.refresh.tooltip')">
						<N8nButton
							variant="subtle"
							iconOnly
							size="small"
							icon="refresh-cw"
							@click="$emit('refresh')"
						/>
					</N8nTooltip>
				</div>
			</div>
			<N8nActionBox
				v-if="!props.settings"
				:heading="i18n.baseText('settings.chatHub.providers.table.empty.title')"
				:description="i18n.baseText('settings.chatHub.providers.table.empty.description')"
			/>
			<N8nDataTableServer
				v-else
				:class="$style.chatProvidersTable"
				:headers="tableHeaders"
				:items="settingItems"
				:items-length="settingItems.length"
			>
				<template #[`item.provider`]="{ item }">
					<div :class="$style.providerCell">
						<CredentialIcon
							v-if="item.provider in PROVIDER_CREDENTIAL_TYPE_MAP"
							:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[item.provider]"
							:size="16"
							:class="$style.menuIcon"
						/>
						<N8nText bold>
							{{ providerDisplayNames[item.provider] }}
						</N8nText>
					</div>
				</template>
				<template #[`item.models`]="{ item }">
					<N8nTooltip
						v-if="item.allowedModels?.length && item.allowedModels?.length > TRUNCATE_MODELS_AFTER"
						:content="
							item.allowedModels
								?.map((m: ChatProviderSettingsDto['allowedModels'][number]) => m.displayName)
								.join(', ')
						"
					>
						<N8nText :color="item.enabled ? 'text-base' : 'primary'">
							{{ modelsText(item) }}
						</N8nText>
					</N8nTooltip>
					<N8nText v-else :color="item.enabled ? 'text-base' : 'primary'">
						{{ modelsText(item) }}
					</N8nText>
				</template>
				<template #[`item.updatedAt`]="{ item }">
					<span>
						<TimeAgo v-if="item.updatedAt" :date="item.updatedAt" />
						<N8nText v-else>-</N8nText>
					</span>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
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

<style lang="scss" module>
.container {
	margin-top: var(--spacing--sm);
	margin-bottom: var(--spacing--xl);
}

.tableContainer {
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
	margin-bottom: var(--spacing--sm);
}

.chatProvidersTable {
	tr:last-child {
		border-bottom: none !important;
	}
}

.menuIcon {
	flex-shrink: 0;
}

.providerCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
