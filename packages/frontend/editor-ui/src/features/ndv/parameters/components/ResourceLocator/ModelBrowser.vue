<script setup lang="ts">
import type { IResourceLocatorResultExpanded } from '@/Interface';
import { N8nIcon, N8nInput, N8nLoading, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import ModelCard from './ModelCard.vue';

type Props = {
	models: IResourceLocatorResultExpanded[];
	loading: boolean;
	filter: string;
	hasMore: boolean;
	selectedValue?: string | number;
	width?: number;
};

const props = withDefaults(defineProps<Props>(), {
	selectedValue: undefined,
	width: 600,
});

const emit = defineEmits<{
	select: [value: string | number];
	filter: [filter: string];
	loadMore: [];
}>();

const gridRef = ref<HTMLDivElement>();
const searchInputRef = ref<InstanceType<typeof N8nInput>>();

type CapabilityFilter =
	| 'functionCalling'
	| 'vision'
	| 'structuredOutput'
	| 'imageGeneration'
	| 'audio';

const activeCapabilityFilters = ref<Set<CapabilityFilter>>(new Set());

const capabilityOptions = [
	{ key: 'functionCalling' as CapabilityFilter, icon: 'wrench' as const, label: 'Functions' },
	{ key: 'vision' as CapabilityFilter, icon: 'eye' as const, label: 'Vision' },
	{
		key: 'structuredOutput' as CapabilityFilter,
		icon: 'code' as const,
		label: 'Structured Output',
	},
	{
		key: 'imageGeneration' as CapabilityFilter,
		icon: 'palette' as const,
		label: 'Image Generation',
	},
	{ key: 'audio' as CapabilityFilter, icon: 'mic' as const, label: 'Audio' },
];

const toggleCapabilityFilter = (capability: CapabilityFilter) => {
	const newFilters = new Set(activeCapabilityFilters.value);
	if (newFilters.has(capability)) {
		newFilters.delete(capability);
	} else {
		newFilters.add(capability);
	}
	activeCapabilityFilters.value = newFilters;
};

// Filter models by text search and capabilities
const filteredModels = computed(() => {
	let filtered = props.models;

	// Text search filter
	if (props.filter) {
		const lowerFilter = props.filter.toLowerCase();
		filtered = filtered.filter((model) => {
			const name = model.name?.toString().toLowerCase() || '';
			const provider = model.metadata?.provider?.toLowerCase() || '';
			return name.includes(lowerFilter) || provider.includes(lowerFilter);
		});
	}

	// Capability filters
	if (activeCapabilityFilters.value.size > 0) {
		filtered = filtered.filter((model) => {
			if (!model.metadata?.capabilities) return false;

			// Model must have ALL selected capabilities
			return Array.from(activeCapabilityFilters.value).every((capability) => {
				return model.metadata?.capabilities[capability] === true;
			});
		});
	}

	return filtered;
});

const onFilterInput = (value: string) => {
	emit('filter', value);
};

const onModelSelect = (value: string | number) => {
	emit('select', value);
};

const onScroll = () => {
	if (!gridRef.value || !props.hasMore || props.loading) return;

	const { scrollTop, scrollHeight, clientHeight } = gridRef.value;
	const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;

	if (scrolledToBottom) {
		emit('loadMore');
	}
};

// Focus search input when component mounts
watch(
	() => props.models,
	() => {
		if (searchInputRef.value) {
			setTimeout(() => {
				(searchInputRef.value as any)?.focus?.();
			}, 0);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.modelBrowser" :style="{ width: `${width}px` }" data-test-id="model-browser">
		<!-- Search Bar -->
		<div :class="$style.searchBar">
			<N8nInput
				ref="searchInputRef"
				:model-value="filter"
				:clearable="true"
				placeholder="Search models by name or provider..."
				size="small"
				data-test-id="model-browser-search"
				@update:model-value="onFilterInput"
			>
				<template #prefix>
					<N8nIcon :class="$style.searchIcon" icon="search" />
				</template>
			</N8nInput>

			<!-- Capability Filters -->
			<div :class="$style.capabilityFilters">
				<N8nTooltip
					v-for="capability in capabilityOptions"
					:key="capability.key"
					:content="capability.label"
					placement="top"
				>
					<button
						:class="{
							[$style.capabilityFilterButton]: true,
							[$style.active]: activeCapabilityFilters.has(capability.key),
						}"
						@click="toggleCapabilityFilter(capability.key)"
					>
						<N8nIcon :icon="capability.icon" size="small" />
					</button>
				</N8nTooltip>
			</div>
		</div>

		<!-- Model Grid -->
		<div ref="gridRef" :class="$style.modelGrid" @scroll="onScroll">
			<ModelCard
				v-for="model in filteredModels"
				:key="model.value.toString()"
				:model="model"
				:selected="model.value === selectedValue"
				@select="onModelSelect(model.value)"
			/>

			<!-- Loading State -->
			<div v-if="loading" :class="$style.loadingCards">
				<div v-for="i in 3" :key="i" :class="$style.loadingCard">
					<N8nLoading :class="$style.loader" variant="p" :rows="3" />
				</div>
			</div>

			<!-- Empty State -->
			<div v-if="!loading && filteredModels.length === 0" :class="$style.emptyState">
				<N8nIcon icon="search" size="xlarge" :class="$style.emptyIcon" />
				<N8nText size="large" color="text-light">No models found</N8nText>
				<N8nText size="small" color="text-light">
					Try adjusting your search or check your connection
				</N8nText>
			</div>
		</div>

		<!-- Results Count -->
		<div :class="$style.resultsFooter">
			<N8nText size="xsmall" color="text-light">
				{{ filteredModels.length }} {{ filteredModels.length === 1 ? 'model' : 'models' }}
				<span v-if="hasMore">• Scroll for more</span>
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.modelBrowser {
	display: flex;
	flex-direction: column;
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	max-height: 600px;
}

.searchBar {
	padding: var(--spacing--sm);
	background: var(--color--background);
	border-bottom: var(--border);
	position: sticky;
	top: 0;
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.searchIcon {
	color: var(--color--text--tint-1);
}

.capabilityFilters {
	display: flex;
	gap: var(--spacing--3xs);
	flex-wrap: wrap;
}

.capabilityFilterButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--light-3);
	cursor: pointer;
	transition: all 0.2s ease;
	color: var(--color--text--tint-1);

	&:hover {
		border-color: var(--color--primary--tint-1);
		background: var(--color--background--light-2);
		color: var(--color--primary);
	}

	&.active {
		border-color: var(--color--primary);
		background: var(--color--primary--tint-3);
		color: var(--color--primary);
		box-shadow: 0 0 0 1px var(--color--primary--tint-2);
	}
}

.modelGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	overflow-y: auto;
	flex: 1;
	min-height: 300px;
	max-height: 500px;

	// Custom scrollbar styling
	&::-webkit-scrollbar {
		width: 12px;
	}

	&::-webkit-scrollbar-thumb {
		border-radius: 12px;
		background: var(--color--foreground--shade-1);
		border: 3px solid var(--color--background);
	}

	&::-webkit-scrollbar-thumb:hover {
		background: var(--color--foreground--shade-2);
	}

	// For larger screens, show 2-3 columns
	@media (min-width: 768px) {
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
	}

	@media (min-width: 1024px) {
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	}
}

.loadingCards {
	display: contents; // Makes children participate in grid layout
}

.loadingCard {
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--xs);
	background: var(--color--background--light-3);
}

.loader {
	* {
		margin-top: 0 !important;
	}
}

.emptyState {
	grid-column: 1 / -1; // Span all columns
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl);
	text-align: center;
}

.emptyIcon {
	color: var(--color--text--tint-2);
	margin-bottom: var(--spacing--sm);
}

.resultsFooter {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
	background: var(--color--background--light-2);
	text-align: center;
}
</style>
