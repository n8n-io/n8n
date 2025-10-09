<script setup lang="ts">
import { computed } from 'vue';
import { N8nNavigationDropdown, N8nIcon, N8nButton } from '@n8n/design-system';
import type { ChatHubConversationModel } from '../chat.types';
import { type ComponentProps } from 'vue-component-type-helpers';
import { type ChatHubProvider, chatHubProviderSchema } from '@n8n/api-types';

const props = defineProps<{
	disabled?: boolean;
	models: ChatHubConversationModel[];
	selectedModel: ChatHubConversationModel | null;
}>();

const emit = defineEmits<{
	change: [ChatHubConversationModel];
	configure: [ChatHubProvider];
}>();

const providerDisplayNames: Record<ChatHubProvider, string> = {
	openai: 'Open AI',
	anthropic: 'Anthropic',
	google: 'Google',
};

const menu = computed(() =>
	chatHubProviderSchema.options.map((provider) => {
		const modelOptions = props.models
			.filter((model) => model.provider === provider)
			.map<ComponentProps<typeof N8nNavigationDropdown>['menu'][number]>((model) => ({
				id: `${model.provider}::${model.model}`,
				title: model.model,
				disabled: false,
			}));

		return {
			id: provider,
			title: providerDisplayNames[provider],
			submenu: modelOptions.concat([
				...(modelOptions.length > 0 ? [{ isDivider: true as const, id: 'divider' }] : []),
				{
					id: `${provider}::configure`,
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

	if (model === 'configure' && parsedProvider) {
		emit('configure', parsedProvider);
		return;
	}

	const selectedModel = props.models.find((m) => m.provider === provider && m.model === model);

	if (selectedModel) {
		emit('change', selectedModel);
	}
}
</script>

<template>
	<N8nNavigationDropdown
		:menu="menu"
		:disabled="disabled || models.length === 0"
		@select="onSelect"
	>
		<N8nButton :class="$style.dropdownButton" type="secondary">
			<span>{{ selectedLabel }}</span>
			<N8nIcon icon="chevron-down" size="small" />
		</N8nButton>
	</N8nNavigationDropdown>
</template>

<style lang="scss" module>
.dropdownButton {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}
</style>
