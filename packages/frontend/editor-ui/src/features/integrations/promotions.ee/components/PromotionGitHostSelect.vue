<script setup lang="ts">
import type { PromotionRepository } from '@n8n/api-types';
import { N8nButton, N8nNotice, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useTemplateRef } from 'vue';

import { usePromotionGitHostDiscovery } from '../composables/usePromotionGitHostDiscovery';
import { usePromotionRepositoryResolution } from '../composables/usePromotionRepositoryResolution';

const props = defineProps<{
	modelValue: string;
	providerId: string;
	kind: 'repository' | 'branch';
	repositoryId?: string;
	inputId: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
	selected: [repository: PromotionRepository];
	resolved: [repository: PromotionRepository];
}>();

const {
	repository: resolvedRepository,
	loading: resolving,
	error: resolutionError,
	receivePage,
	select: selectRepository,
	retry: retryResolution,
} = usePromotionRepositoryResolution({
	providerId: () => (props.kind === 'repository' ? props.providerId : undefined),
	remoteUrl: () => props.modelValue,
	onResolved: (repository) => emit('resolved', repository),
});

const i18n = useI18n();
const { options, search, nextCursor, loading, error, onSearch, cancel, retry, loadMore } =
	usePromotionGitHostDiscovery(props, receivePage);
const selectOpen = ref(false);
const footer = useTemplateRef<HTMLElement>('footer');

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
		resolvedRepository.value?.remoteUrl === props.modelValue
			? {
					value: props.modelValue,
					label: resolvedRepository.value.fullPath,
					repository: resolvedRepository.value,
				}
			: { value: props.modelValue, label: props.modelValue };
	return [selected, ...options.value];
});
const menuVisible = computed(
	() => selectOpen.value && (loading.value || visibleOptions.value.length > 0 || !!search.value),
);

function select(value: string) {
	const option = visibleOptions.value.find((item) => item.value === value);
	emit('update:modelValue', value);
	if (option?.repository) {
		cancel();
		selectRepository(option.repository);
		emit('selected', option.repository);
	}
}

function focusFooter(event: KeyboardEvent) {
	if (!menuVisible.value || event.shiftKey || !(event.target instanceof HTMLInputElement)) return;
	const action = footer.value?.querySelector<HTMLButtonElement>('button:not(:disabled)');
	if (!action) return;
	// Element Plus closes on Tab before the footer can receive focus.
	event.preventDefault();
	event.stopPropagation();
	action.focus();
}
</script>

<template>
	<div :class="$style.picker" @keydown.tab.capture="focusFooter">
		<N8nSelect
			:id="inputId"
			:model-value="modelValue"
			:disabled="unavailable"
			:loading="loading"
			:teleported="false"
			filterable
			remote
			:remote-method="onSearch"
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
			@visible-change="selectOpen = $event"
		>
			<N8nOption
				v-for="option in visibleOptions"
				:key="`${option.value}:${option.label}`"
				:value="option.value"
				:label="option.label"
			/>
			<template v-if="error || nextCursor" #footer>
				<div ref="footer" @click.stop>
					<N8nButton
						v-if="error"
						type="button"
						variant="outline"
						:disabled="unavailable || loading"
						@click="retry"
					>
						{{ i18n.baseText('generic.retry') }}
					</N8nButton>
					<N8nButton
						v-else-if="nextCursor"
						type="button"
						variant="outline"
						:disabled="unavailable || loading"
						:loading="loading"
						@click="loadMore"
					>
						{{ i18n.baseText('settings.promotions.discovery.loadMore') }}
					</N8nButton>
				</div>
			</template>
		</N8nSelect>
		<N8nText
			v-if="
				!loading &&
				!resolving &&
				!error &&
				!resolutionError &&
				!unavailable &&
				options.length === 0 &&
				!nextCursor
			"
			size="small"
			color="text-light"
			role="status"
		>
			{{ emptyMessage }}
		</N8nText>
		<N8nNotice v-if="error" theme="danger" role="alert">
			{{ error }}
			<N8nButton
				v-if="!menuVisible"
				type="button"
				variant="outline"
				:disabled="unavailable || loading"
				@click="retry"
			>
				{{ i18n.baseText('generic.retry') }}
			</N8nButton>
		</N8nNotice>
		<N8nNotice v-if="resolutionError" theme="danger" role="alert">
			{{ resolutionError }}
			<N8nButton
				type="button"
				variant="outline"
				:disabled="unavailable || resolving"
				@click="retryResolution"
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
