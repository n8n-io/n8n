<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { N8nNavigationDropdown, N8nIcon, N8nButton, N8nText } from '@n8n/design-system';
import { type ComponentProps } from 'vue-component-type-helpers';
import {
	chatHubProviderSchema,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubConversationModel,
	type ChatModelsResponse,
	type ChatHubLLMProvider,
	type ChatHubProvider,
} from '@n8n/api-types';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { onClickOutside } from '@vueuse/core';

const props = defineProps<{
	models: ChatModelsResponse | null;
	selectedModel: ChatHubConversationModel | null;
	credentialsName?: string;
}>();

const emit = defineEmits<{
	change: [ChatHubConversationModel];
	configure: [ChatHubLLMProvider];
}>();

const dropdownRef = useTemplateRef('dropdownRef');

const menu = computed(() =>
	chatHubProviderSchema.options
		.filter((provider) => provider !== 'n8n') // Hide n8n provider for now
		.map((provider: ChatHubProvider) => {
			const models = props.models?.[provider].models ?? [];
			const error = props.models?.[provider].error;

			const modelOptions =
				models.length > 0
					? models.map<ComponentProps<typeof N8nNavigationDropdown>['menu'][number]>((model) => {
							const identifier = model.provider === 'n8n' ? model.workflowId : model.model;

							return {
								id: `${provider}::${identifier}`,
								title: model.name,
								disabled: false,
							};
						})
					: error
						? [{ id: `${provider}::error`, value: null, disabled: true, title: error }]
						: [];

			const submenu = modelOptions.concat([
				...(provider !== 'n8n' && modelOptions.length > 0
					? [{ isDivider: true as const, id: 'divider' }]
					: []),
			]);

			if (provider !== 'n8n') {
				submenu.push({
					id: `${provider}::configure`,
					icon: 'settings',
					title: 'Configure credentials...',
					disabled: false,
				});
			}

			return {
				id: provider,
				hidden: true,
				title: providerDisplayNames[provider],
				submenu,
			};
		}),
);

const selectedLabel = computed(() => {
	if (!props.selectedModel) return 'Select model';
	return props.selectedModel.name;
});

function onSelect(id: string) {
	// Format is "provider::identifier", where identifier is either "configure", model name, or workflow ID for n8n
	const [provider, identifier] = id.split('::');
	const parsedProvider = chatHubProviderSchema.safeParse(provider).data;

	if (!parsedProvider) {
		return;
	}

	if (identifier === 'configure' && parsedProvider !== 'n8n') {
		emit('configure', parsedProvider);
		return;
	}

	const model = parsedProvider === 'n8n' ? null : identifier;
	const workflowId = parsedProvider === 'n8n' ? identifier : null;
	const selected = props.models?.[parsedProvider].models.find((m) =>
		m.provider === 'n8n' ? m.workflowId === workflowId : m.model === model,
	);

	if (!selected) {
		return;
	}

	emit('change', selected);
}

onClickOutside(
	computed(() => dropdownRef.value?.$el),
	() => dropdownRef.value?.close(),
);

defineExpose({
	open: () => dropdownRef.value?.open(),
});
</script>

<template>
	<N8nNavigationDropdown ref="dropdownRef" :menu="menu" @select="onSelect">
		<template #item-icon="{ item }">
			<CredentialIcon
				v-if="item.id in PROVIDER_CREDENTIAL_TYPE_MAP"
				:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[item.id as ChatHubLLMProvider]"
				:size="16"
				:class="$style.menuIcon"
			/>
		</template>

		<N8nButton :class="$style.dropdownButton" type="secondary" text>
			<CredentialIcon
				v-if="selectedModel && selectedModel.provider in PROVIDER_CREDENTIAL_TYPE_MAP"
				:credential-type-name="
					PROVIDER_CREDENTIAL_TYPE_MAP[selectedModel.provider as ChatHubLLMProvider]
				"
				:size="credentialsName ? 20 : 16"
				:class="$style.icon"
			/>
			<div :class="$style.selected">
				<div>
					{{ selectedLabel }}
				</div>
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

	/* disable underline */
	text-decoration: none !important;
}

.selected {
	display: flex;
	flex-direction: column;
	align-items: start;
	gap: var(--spacing--4xs);
	max-width: 200px;

	& > div {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.icon {
	flex-shrink: 0;
	margin-block: -4px;
}

.menuIcon {
	flex-shrink: 0;
}
</style>
