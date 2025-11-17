<script setup lang="ts">
import { ref } from 'vue';
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
import { ChatProviderSettingsDto } from '@n8n/api-types';
import { providerDisplayNames } from '../constants';
import TimeAgo from '@/app/components/TimeAgo.vue';

const TRUNCATE_MODELS_AFTER = 4;

type Props = {
	providers: ChatProviderSettingsDto[];
	loading: boolean;
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
		width: 150,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.chatHub.providers.table.models'),
		key: 'models',
		width: 250,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.chatHub.providers.table.updatedAt'),
		key: 'updatedAt',
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

const tableActions = ref<Array<{ label: string; value: string }>>([
	{
		label: i18n.baseText('settings.chatHub.providers.table.action.editProvider'),
		value: 'editProvider',
	},
]);

const modelsText = (settings: ChatProviderSettingsDto) => {
	if (!settings.enabled) {
		return i18n.baseText('settings.chatHub.providers.table.models.disabled');
	} else if (!settings.limitModels) {
		return i18n.baseText('settings.chatHub.providers.table.models.allModels');
	} else if (!settings.allowedModels || settings.allowedModels.length === 0) {
		return i18n.baseText('settings.chatHub.providers.table.models.noModels');
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
							size="small"
							type="tertiary"
							icon="refresh-cw"
							:square="true"
							@click="$emit('refresh')"
						/>
					</N8nTooltip>
				</div>
			</div>
			<N8nActionBox
				v-if="props.providers.length === 0"
				:heading="i18n.baseText('settings.chatHub.providers.table.empty.title')"
				:description="i18n.baseText('settings.chatHub.providers.table.empty.description')"
			/>
			<N8nDataTableServer
				v-else
				:class="$style['chat-providers-table']"
				:headers="tableHeaders"
				:items="props.providers"
				:items-length="props.providers.length"
			>
				<template #[`item.provider`]="{ item }">
					<div :class="$style['provider-cell']">
						<span>
							<N8nText>
								{{ providerDisplayNames[item.provider] }}
							</N8nText>
						</span>
					</div>
				</template>
				<template #[`item.models`]="{ item }">
					<N8nTooltip
						v-if="item.allowedModels?.length && item.allowedModels?.length > TRUNCATE_MODELS_AFTER"
						:content="item.allowedModels?.map((m) => m.displayName).join(', ')"
						placement="top"
					>
						<N8nText>
							{{ modelsText(item) }}
						</N8nText>
					</N8nTooltip>
					<N8nText v-else>
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
