<script setup lang="ts">
import { computed } from 'vue';
import { N8nNavigationDropdown, N8nIcon, N8nButton, N8nText } from '@n8n/design-system';
import { type ComponentProps } from 'vue-component-type-helpers';
import {
	type ChatHubConversationModel,
	type ChatHubProvider,
	chatHubProviderSchema,
	type ChatModelsResponse,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { providerDisplayNames } from '@/features/chatHub/constants';
import CredentialIcon from '@/components/CredentialIcon.vue';

const props = defineProps<{
	disabled?: boolean;
	models: ChatModelsResponse | null;
	selectedModel: ChatHubConversationModel | null;
	credentialsName?: string;
}>();

const emit = defineEmits<{
	change: [ChatHubConversationModel];
	configure: [ChatHubProvider];
}>();

const menu = computed(() =>
	chatHubProviderSchema.options.map((provider) => {
		const models = props.models?.[provider].models ?? [];
		const error = props.models?.[provider].error;

		const modelOptions =
			models.length > 0
				? models.map<ComponentProps<typeof N8nNavigationDropdown>['menu'][number]>((model) => ({
						id: `${provider}::${model.name}`,
						title: model.name,
						disabled: false,
					}))
				: error
					? [{ id: `${provider}::error`, disabled: true, title: error }]
					: [];

		return {
			id: provider,
			title: providerDisplayNames[provider],
			submenu: modelOptions.concat([
				...(modelOptions.length > 0 ? [{ isDivider: true as const, id: 'divider' }] : []),
				{
					id: `${provider}::configure`,
					icon: 'settings',
					title: 'Configure credentials...',
					disabled: false,
				},
			]),
		};
	}),
);

const selectedLabel = computed(() => {
	if (!props.selectedModel) return 'Select model';
	return props.selectedModel.model;
});

function onSelect(id: string) {
	// Format is "provider::model"
	const [provider, model] = id.split('::');
	const parsedProvider = chatHubProviderSchema.safeParse(provider).data;

	if (!parsedProvider) {
		return;
	}

	if (model === 'configure') {
		emit('configure', parsedProvider);
		return;
	}

	emit('change', { provider: parsedProvider, model });
}
</script>

<template>
	<N8nNavigationDropdown :menu="menu" :disabled="disabled" @select="onSelect">
		<template #item-icon="{ item }">
			<CredentialIcon
				v-if="item.id in PROVIDER_CREDENTIAL_TYPE_MAP"
				:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[item.id as ChatHubProvider]"
				:size="16"
				:class="$style.menuIcon"
			/>
		</template>

		<N8nButton :class="$style.dropdownButton" type="secondary">
			<CredentialIcon
				v-if="selectedModel"
				:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[selectedModel.provider]"
				:size="credentialsName ? 20 : 16"
				:class="$style.icon"
			/>
			<div :class="$style.selected">
				{{ selectedLabel }}
				<N8nText v-if="credentialsName" size="xsmall" color="text-light">
					{{ credentialsName }}
				</N8nText>
			</div>
			<N8nIcon icon="chevron-down" size="medium" />
		</N8nButton>
	</N8nNavigationDropdown>
</template>

<style lang="scss" module>
.dropdownButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.selected {
	display: flex;
	flex-direction: column;
	align-items: start;
	gap: var(--spacing--4xs);
}

.icon {
	flex-shrink: 0;
	margin-block: -4px;
}

.menuIcon {
	flex-shrink: 0;
}
</style>
