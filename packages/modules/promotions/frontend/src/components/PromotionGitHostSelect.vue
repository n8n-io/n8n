<script setup lang="ts">
import type { PromotionRepository } from '@n8n/api-types';
import { N8nButton, N8nNotice, N8nOption, N8nSelect, N8nSpinner } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useCssModule, watch } from 'vue';

import { usePromotionGitHostDiscovery } from '../composables/usePromotionGitHostDiscovery';

const props = defineProps<{
	modelValue: string;
	selectedLabel?: string;
	providerId: string;
	kind: 'repository' | 'branch';
	repositoryId?: string;
	revision?: number;
	inputId: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
	selected: [repository: PromotionRepository];
}>();

const i18n = useI18n();
const $style = useCssModule();
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
			: { value: props.modelValue, label: props.selectedLabel ?? props.modelValue };
	return [selected, ...options.value];
});

// Only the first load replaces the list with a loading message. Later loads keep the list at
// its size and dim it, so the dropdown does not resize on every search.
const refreshing = computed(() => loading.value && options.value.length > 0);
const popperClass = computed(() =>
	[$style.popper, refreshing.value && $style.refreshing].join(' '),
);

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

// Without a remote method, Element Plus filters the loaded options by label on every keystroke.
// That hides them before the server answers. The discovery composable does the search instead.
function skipLocalFilter() {}

function onInput(event: Event) {
	// Dropdown close events must not clear the search used by retry.
	if (event.target instanceof HTMLInputElement) onSearch(event.target.value);
}
</script>

<template>
	<div :class="$style.picker" @input="onInput">
		<N8nSelect
			:id="inputId"
			:model-value="modelValue"
			:disabled="unavailable"
			:loading="loading && !refreshing"
			:popper-class="popperClass"
			filterable
			remote
			:remote-method="skipLocalFilter"
			remote-show-suffix
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
			<template v-if="loading && !refreshing" #empty>
				<div
					:class="$style.loading"
					role="status"
					:aria-label="i18n.baseText('generic.loading')"
					data-test-id="promotion-git-host-loading"
				>
					<N8nSpinner type="dots" />
				</div>
			</template>
			<N8nOption
				v-for="option in visibleOptions"
				:key="`${option.value}:${option.label}`"
				:value="option.value"
				:label="option.label"
			/>
		</N8nSelect>
		<span :class="$style.srOnly" role="status">
			<span v-if="search">
				{{ i18n.baseText('settings.promotions.discovery.searchHint', { interpolate: { search } }) }}
			</span>
			<span
				v-if="!loading && !error && !unavailable && options.length === 0 && (!modelValue || search)"
			>
				{{ emptyMessage }}
			</span>
		</span>
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

// The dropdown is teleported to the body, so these rules target the Element Plus class names.
.popper {
	// Open at full size instead of growing in.
	&:global(.el-zoom-in-top-enter-active),
	&:global(.el-zoom-in-top-leave-active) {
		transition: none;
	}
}

.loading {
	display: flex;
	justify-content: center;
	padding-block: var(--spacing--xs);
}

.refreshing :global(.el-select-dropdown__item) {
	opacity: 0.5;
}

.srOnly {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
