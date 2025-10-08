<script setup lang="ts">
import { computed } from 'vue';
import { N8nNavigationDropdown, N8nIcon, N8nButton } from '@n8n/design-system';
import type { ChatHubConversationModel } from '../chat.types';
import { type ComponentProps } from 'vue-component-type-helpers';

const props = defineProps<{
	disabled?: boolean;
	models: ChatHubConversationModel[];
	availableCredentialTypes: Set<string>;
	selectedModel: ChatHubConversationModel | null;
}>();

const emit = defineEmits<{
	change: [ChatHubConversationModel];
	configure: [provider: string];
}>();

function isModelAvailable(model: ChatHubConversationModel): boolean {
	return props.availableCredentialTypes.has(model.credentialType);
}

const menu = computed(() => {
	const providerMap = new Map<string, ChatHubConversationModel[]>();

	// Group models by provider
	props.models.forEach((model) => {
		if (!providerMap.has(model.provider)) {
			providerMap.set(model.provider, []);
		}
		providerMap.get(model.provider)!.push(model);
	});

	// Build menu structure
	return Array.from(providerMap.entries()).map(([provider, models]) => {
		const firstModel = models[0];
		const modelOptions = models.map<ComponentProps<typeof N8nNavigationDropdown>['menu'][number]>(
			(model) => ({
				id: `${model.provider}::${model.model}`,
				title: model.displayName ?? model.model,
				icon: isModelAvailable(model) ? undefined : 'lock',
				disabled: false,
			}),
		);

		return {
			id: provider,
			title: firstModel.providerDisplayName || provider,
			submenu: modelOptions.concat([
				...(modelOptions.length > 0 ? [{ isDivider: true as const, id: 'divider' }] : []),
				{
					id: `${provider}::configure`,
					title: 'Configure credentials...',
					disabled: false,
				},
			]),
		};
	});
});

const selectedLabel = computed(() => {
	if (!props.selectedModel) return 'Select model';
	return props.selectedModel.displayName || props.selectedModel.model;
});

function onSelect(id: string) {
	// Format is "provider::model"
	const [provider, model] = id.split('::');

	if (model === 'configure') {
		emit('configure', provider);
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
