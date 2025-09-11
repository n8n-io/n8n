<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { IResourceLocatorResultExpanded } from '@/Interface';
import { N8nLoading } from '@n8n/design-system';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import type { INodeParameterResourceLocator } from 'n8n-workflow';
import { computed, onBeforeUnmount, onMounted, ref, useCssModule, watch } from 'vue';

const SEARCH_BAR_HEIGHT_PX = 40;
const SCROLL_MARGIN_PX = 10;

type Props = {
	modelValue?: INodeParameterResourceLocator;
	resources?: IResourceLocatorResultExpanded[];
	show?: boolean;
	filterable?: boolean;
	loading?: boolean;
	filter?: string;
	hasMore?: boolean;
	errorView?: boolean;
	filterRequired?: boolean;
	width?: number;
	allowNewResources?: { label?: string };
	eventBus?: EventBus;
};

const props = withDefaults(defineProps<Props>(), {
	modelValue: undefined,
	resources: () => [],
	show: false,
	filterable: false,
	loading: false,
	filter: '',
	hasMore: false,
	errorView: false,
	filterRequired: false,
	width: undefined,
	allowNewResources: () => ({}),
	eventBus: () => createEventBus(),
});

const emit = defineEmits<{
	'update:modelValue': [value: INodeParameterResourceLocator['value']];
	loadMore: [];
	filter: [filter: string];
	addResourceClick: [];
}>();

const i18n = useI18n();
const $style = useCssModule();

const hoverIndex = ref(0);
const showHoverUrl = ref(false);
const searchRef = ref<HTMLInputElement>();
const resultsContainerRef = ref<HTMLDivElement>();
const itemsRef = ref<HTMLDivElement[]>([]);

const sortedResources = computed<IResourceLocatorResultExpanded[]>(() => {
	const seen = new Set();
	const result = props.resources.reduce(
		(acc, item: IResourceLocatorResultExpanded) => {
			if (seen.has(item.value)) {
				return acc;
			}
			seen.add(item.value);

			if (props.modelValue && item.value === props.modelValue.value) {
				acc.selected = item;
			} else if (!item.isArchived) {
				// Archived items are not shown in the list unless selected
				acc.notSelected.push(item);
			}

			return acc;
		},
		{
			selected: null as IResourceLocatorResultExpanded | null,
			notSelected: [] as IResourceLocatorResultExpanded[],
		},
	);

	// Resources are paginated, so the currently selected one may not actually be
	// in the list.
	// If that's the case we'll render the cached value.
	if (result.selected === null && props.modelValue?.cachedResultName && props.modelValue.value) {
		result.selected = {
			name: props.modelValue.cachedResultName,
			value: props.modelValue.value,
			url: props.modelValue.cachedResultUrl,
		};
	}

	if (result.selected) {
		return [result.selected, ...result.notSelected];
	}

	return result.notSelected;
});

watch(
	() => props.show,
	(value) => {
		if (value) {
			hoverIndex.value = 0;
			showHoverUrl.value = false;

			setTimeout(() => {
				if (value && props.filterable && searchRef.value) {
					searchRef.value.focus();
				}
			}, 0);
		}
	},
);

onMounted(() => {
	props.eventBus.on('keyDown', onKeyDown);
});

onBeforeUnmount(() => {
	props.eventBus.off('keyDown', onKeyDown);
});

function openUrl(event: MouseEvent, url: string) {
	event.preventDefault();
	event.stopPropagation();

	window.open(url, '_blank');
}

function onKeyDown(e: KeyboardEvent) {
	if (e.key === 'ArrowDown') {
		// hoverIndex 0 is reserved for the "add new resource" item
		if (hoverIndex.value < sortedResources.value.length) {
			hoverIndex.value++;

			if (resultsContainerRef.value && itemsRef.value.length === 1) {
				const item = itemsRef.value[0];
				if (
					item.offsetTop + item.clientHeight >
					resultsContainerRef.value.scrollTop + resultsContainerRef.value.offsetHeight
				) {
					const top = item.offsetTop - resultsContainerRef.value.offsetHeight + item.clientHeight;
					resultsContainerRef.value.scrollTo({ top });
				}
			}
		}
	} else if (e.key === 'ArrowUp') {
		if (hoverIndex.value > 0) {
			hoverIndex.value--;

			const searchOffset = props.filterable ? SEARCH_BAR_HEIGHT_PX : 0;
			if (resultsContainerRef.value && itemsRef.value.length === 1) {
				const item = itemsRef.value[0];
				if (item.offsetTop <= resultsContainerRef.value.scrollTop + searchOffset) {
					resultsContainerRef.value.scrollTo({ top: item.offsetTop - searchOffset });
				}
			}
		}
	} else if (e.key === 'Enter') {
		if (hoverIndex.value === 0 && props.allowNewResources.label) {
			emit('addResourceClick');
			return;
		}

		const selected = sortedResources.value[hoverIndex.value - 1]?.value;

		// Selected resource can be empty when loading or empty results
		if (selected && typeof selected !== 'boolean') {
			emit('update:modelValue', selected);
		}
	}
}

function onFilterInput(value: string) {
	emit('filter', value);
}

function onItemClick(selected: string | number | boolean) {
	if (typeof selected === 'boolean') {
		return;
	}

	emit('update:modelValue', selected);
}

function onItemHover(index: number) {
	hoverIndex.value = index;

	setTimeout(() => {
		if (hoverIndex.value === index) {
			showHoverUrl.value = true;
		}
	}, 250);
}

function onItemHoverLeave() {
	showHoverUrl.value = false;
}

function onResultsEnd() {
	if (props.loading || !props.hasMore) {
		return;
	}

	if (resultsContainerRef.value) {
		const diff =
			resultsContainerRef.value.offsetHeight -
			(resultsContainerRef.value.scrollHeight - resultsContainerRef.value.scrollTop);
		if (diff > -SCROLL_MARGIN_PX && diff < SCROLL_MARGIN_PX) {
			emit('loadMore');
		}
	}
}

function isWithinDropdown(element: HTMLElement) {
	return Boolean(element.closest('.' + $style.popover));
}

defineExpose({ isWithinDropdown });
</script>

<template>
	<n8n-popover
		placement="bottom"
		:width="props.width"
		:popper-class="$style.popover"
		:visible="props.show"
		:teleported="false"
		data-test-id="resource-locator-dropdown"
	>
		<div v-if="props.errorView" :class="$style.messageContainer">
			<slot name="error"></slot>
		</div>
		<div
			v-if="props.filterable && !props.errorView"
			:class="$style.searchInput"
			@keydown="onKeyDown"
		>
			<N8nInput
				ref="searchRef"
				:model-value="props.filter"
				:clearable="true"
				:placeholder="
					props.allowNewResources.label
						? i18n.baseText('resourceLocator.placeholder.searchOrCreate')
						: i18n.baseText('resourceLocator.placeholder.search')
				"
				data-test-id="rlc-search"
				@update:model-value="onFilterInput"
			>
				<template #prefix>
					<n8n-icon :class="$style.searchIcon" icon="search" />
				</template>
			</N8nInput>
		</div>
		<div
			v-if="props.filterRequired && !props.filter && !props.errorView && !props.loading"
			:class="$style.searchRequired"
		>
			{{ i18n.baseText('resourceLocator.mode.list.searchRequired') }}
		</div>
		<div
			v-else-if="
				!props.errorView &&
				!props.allowNewResources.label &&
				sortedResources.length === 0 &&
				!props.loading
			"
			:class="$style.messageContainer"
		>
			{{ i18n.baseText('resourceLocator.mode.list.noResults') }}
		</div>
		<div
			v-else-if="!props.errorView"
			ref="resultsContainerRef"
			:class="$style.container"
			@scroll="onResultsEnd"
		>
			<div
				v-if="props.allowNewResources.label"
				key="addResourceKey"
				ref="itemsRef"
				data-test-id="rlc-item-add-resource"
				:class="{
					[$style.resourceItem]: true,
					[$style.hovering]: hoverIndex === 0,
				}"
				@mouseenter="() => onItemHover(0)"
				@mouseleave="() => onItemHoverLeave()"
				@click="() => emit('addResourceClick')"
			>
				<div :class="$style.resourceNameContainer">
					<span :class="$style.addResourceText">{{ props.allowNewResources.label }}</span>
					<n8n-icon :class="$style.addResourceIcon" icon="plus" />
				</div>
			</div>
			<div
				v-for="(result, i) in sortedResources"
				:key="result.value.toString()"
				ref="itemsRef"
				:class="{
					[$style.resourceItem]: true,
					[$style.selected]: result.value === props.modelValue?.value,
					[$style.hovering]: hoverIndex === i + 1,
				}"
				data-test-id="rlc-item"
				@click="() => onItemClick(result.value)"
				@mouseenter="() => onItemHover(i + 1)"
				@mouseleave="() => onItemHoverLeave()"
			>
				<div :class="$style.resourceNameContainer">
					<span>{{ result.name }}</span>
					<span v-if="result.isArchived">
						<N8nBadge class="ml-3xs" theme="tertiary" bold data-test-id="workflow-archived-tag">
							{{ i18n.baseText('workflows.item.archived') }}
						</N8nBadge>
					</span>
				</div>
				<div :class="$style.urlLink">
					<n8n-icon
						v-if="showHoverUrl && result.url && hoverIndex === i + 1"
						icon="external-link"
						:title="result.linkAlt || i18n.baseText('resourceLocator.mode.list.openUrl')"
						@click="openUrl($event, result.url)"
					/>
				</div>
			</div>
			<div v-if="props.loading && !props.errorView">
				<div v-for="i in 3" :key="i" :class="$style.loadingItem">
					<N8nLoading :class="$style.loader" variant="p" :rows="1" />
				</div>
			</div>
		</div>
		<template #reference>
			<slot />
		</template>
	</n8n-popover>
</template>

<style lang="scss" module>
:root .popover {
	--content-height: 236px;
	padding: 0 !important;
	border: var(--border-base);
	display: flex;
	max-height: calc(var(--content-height) + var(--spacing-xl));
	flex-direction: column;

	& ::-webkit-scrollbar {
		width: 12px;
	}

	& ::-webkit-scrollbar-thumb {
		border-radius: 12px;
		background: var(--color-foreground-dark);
		border: 3px solid white;
	}

	& ::-webkit-scrollbar-thumb:hover {
		background: var(--color-foreground-xdark);
	}
}

.container {
	position: relative;
	overflow: auto;
}

.messageContainer {
	height: 236px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.searchInput {
	border-bottom: var(--border-base);
	--input-border-color: none;
	--input-font-size: var(--font-size-2xs);
	width: 100%;
	z-index: 1;
}

.selected {
	color: var(--color-primary);
}

.resourceItem {
	display: flex;
	padding: 0 var(--spacing-xs);
	white-space: nowrap;
	height: 32px;
	cursor: pointer;

	&:hover {
		background-color: var(--color-background-base);
	}
}

.loadingItem {
	padding: 10px var(--spacing-xs);
}

.loader {
	max-width: 120px;

	* {
		margin-top: 0 !important;
		max-height: 12px;
	}
}

.hovering {
	background-color: var(--color-background-base);
}

.searchRequired {
	height: 50px;
	margin-top: 40px;
	padding-left: var(--spacing-xs);
	font-size: var(--font-size-xs);
	color: var(--color-text-base);
	display: flex;
	align-items: center;
}

.urlLink {
	display: flex;
	align-items: center;
	font-size: var(--font-size-3xs);
	color: var(--color-text-base);
	margin-left: var(--spacing-2xs);

	&:hover {
		color: var(--color-primary);
	}
}

.resourceNameContainer {
	font-size: var(--font-size-2xs);
	overflow: hidden;
	text-overflow: ellipsis;
	display: inline-block;
	align-self: center;
}

.searchIcon {
	color: var(--color-text-light);
}

.addResourceText {
	font-weight: var(--font-weight-bold);
}

.addResourceIcon {
	color: var(--color-text-light);

	margin-left: var(--spacing-2xs);
}
</style>
