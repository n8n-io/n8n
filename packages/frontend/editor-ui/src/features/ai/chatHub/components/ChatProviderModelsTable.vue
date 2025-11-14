<script setup lang="ts">
import { computed, ref } from 'vue';
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
	ChatModelDto,
	ChatProviderSettingsDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { CHAT_CREDENTIAL_SELECTOR_MODAL_KEY, CHAT_PROVIDER_SETTINGS_MODAL_KEY } from '../constants';

interface Model extends ChatModelDto {
	enabled: boolean;
}

type Props = {
	models: Array<Model>;
	loading: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	toggleModel: [provider: ChatModelDto, enabled: boolean];
}>();

const uiStore = useUIStore();
const i18n = useI18n();

const tableHeaders = ref<Array<TableHeader<Model>>>([
	{
		title: i18n.baseText('settings.chatHub.models.table.model'),
		key: 'name',
		width: 150,
		disableSort: true,
		value() {
			return;
		},
	},
]);

const initialSelection = computed<string[]>(() => {
	return props.models.filter((model) => model.enabled).map((model) => model.name);
});
</script>

<template>
	<div :class="$style['table-container']">
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" class="mb-l" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else class="mt-s mb-xl">
			<div :class="$style.header">
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('settings.chatHub.models.table.title') }}
				</N8nText>
			</div>
			<N8nActionBox
				v-if="props.models.length === 0"
				data-test-id="empty-provider-list-box"
				:heading="i18n.baseText('settings.chatHub.models.table.empty.title')"
				:description="i18n.baseText('settings.chatHub.models.table.empty.description')"
			/>
			<N8nDataTableServer
				v-else
				:class="$style['chat-models-table']"
				data-test-id="chat-models-table"
				:headers="tableHeaders"
				:items="props.models"
				:items-length="props.models.length"
				:showSelect="true"
				:itemValue="'name'"
				v-model:selection="initialSelection"
			>
				<template #[`item.name`]="{ item }">
					<div :class="$style['model-cell']">
						<span>
							<N8nText>
								{{ item.name }}
							</N8nText>
						</span>
					</div>
				</template>
			</N8nDataTableServer>
		</div>
	</div>
</template>

<style module lang="scss">
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.table-container {
	:global(.table-pagination) {
		display: none;
	}
}

.chat-models-table {
	tr:last-child {
		border-bottom: none !important;
	}
}
</style>
