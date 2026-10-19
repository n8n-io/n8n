<script setup lang="ts">
import type { PromotionRepository } from '@n8n/api-types';
import { N8nButton, N8nNotice, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { usePromotionGitHostDiscovery } from '../composables/usePromotionGitHostDiscovery';

const props = defineProps<{
	modelValue: string;
	providerId: string;
	kind: 'repository' | 'branch';
	repositoryId?: string;
	revision?: number;
	inputId: string;
	descriptionId?: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
	selected: [repository: PromotionRepository];
}>();

const i18n = useI18n();
const { options, search, loading, error, onSearch, cancel, retry } =
	usePromotionGitHostDiscovery(props);
const selectedRepository = ref<PromotionRepository>();
watch(
	() => [props.providerId, props.revision],
	() => {
		selectedRepository.value = undefined;
	},
);

const unavailable = computed(
	() => props.disabled || (props.kind === 'branch' && !props.repositoryId),
);
const emptyMessage = computed(() =>
	i18n.baseText(
		props.kind === 'repository'
			? 'settings.promotions.discovery.repository.empty'
			: 'settings.promotions.discovery.branch.empty',
	),
);
const visibleOptions = computed(() => {
	if (!props.modelValue || options.value.some(({ value }) => value === props.modelValue))
		return options.value;
	const selected =
		selectedRepository.value?.remoteUrl === props.modelValue
			? {
					value: props.modelValue,
					label: selectedRepository.value.fullPath,
					repository: selectedRepository.value,
				}
			: { value: props.modelValue, label: props.modelValue };
	return [selected, ...options.value];
});

function select(value: string) {
	const option = visibleOptions.value.find((item) => item.value === value);
	cancel();
	onSearch('');
	emit('update:modelValue', value);
	if (option?.repository) {
		selectedRepository.value = option.repository;
		emit('selected', option.repository);
	}
}

function onInput(event: Event) {
	// Dropdown close events must not clear the search used by retry.
	if (event.target instanceof HTMLInputElement) onSearch(event.target.value);
}
</script>

<template>
	<div :class="$style.picker" @input="onInput">
		<N8nSelect
			:id="inputId"
			:aria-describedby="descriptionId"
			:model-value="modelValue"
			:disabled="unavailable"
			:loading="loading"
			:teleported="false"
			filterable
			remote
			:placeholder="
				i18n.baseText(
					kind === 'repository'
						? 'settings.promotions.discovery.repository.placeholder'
						: 'settings.promotions.discovery.branch.placeholder',
				)
			"
			:no-data-text="emptyMessage"
			:no-match-text="emptyMessage"
			@update:model-value="select"
		>
			<N8nOption
				v-for="option in visibleOptions"
				:key="`${option.value}:${option.label}`"
				:value="option.value"
				:label="option.label"
			/>
		</N8nSelect>
		<N8nText v-if="search" size="small" color="text-light" role="status">
			{{ i18n.baseText('settings.promotions.discovery.searchHint', { interpolate: { search } }) }}
		</N8nText>
		<N8nText
			v-if="!loading && !error && !unavailable && options.length === 0 && (!modelValue || search)"
			size="small"
			color="text-light"
			role="status"
		>
			{{ emptyMessage }}
		</N8nText>
		<N8nNotice v-if="error" theme="danger" role="alert">
			{{ error }}
			<N8nButton
				type="button"
				variant="outline"
				:disabled="unavailable || loading"
				@click.stop="retry"
			>
				{{ i18n.baseText('generic.retry') }}
			</N8nButton>
		</N8nNotice>
	</div>
</template>

<style lang="scss" module>
.picker {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
