<template>
	<n8n-popover
		placement="bottom"
		:width="width"
		:popper-class="$style.popover"
		:value="show"
		trigger="manual"
		v-click-outside="onClickOutside"
	>
		<div :class="$style.messageContainer" v-if="errorView">
			<slot name="error"></slot>
		</div>
		<div :class="$style.searchInput" v-if="filterable && !errorView" @keydown="onKeyDown">
			<n8n-input
				size="medium"
				:value="filter"
				:clearable="true"
				@input="onFilterInput"
				ref="search"
				:placeholder="$locale.baseText('resourceLocator.search.placeholder')"
			>
				<template #prefix>
					<font-awesome-icon :class="$style.searchIcon" icon="search" />
				</template>
			</n8n-input>
		</div>
		<div v-if="filterRequired && !filter && !errorView && !loading" :class="$style.searchRequired">
			{{ $locale.baseText('resourceLocator.mode.list.searchRequired') }}
		</div>
		<div
			:class="$style.messageContainer"
			v-else-if="!errorView && sortedResources.length === 0 && !loading"
		>
			{{ $locale.baseText('resourceLocator.mode.list.noResults') }}
		</div>
		<div
			v-else-if="!errorView"
			ref="resultsContainer"
			:class="$style.container"
			@scroll="onResultsEnd"
		>
			<div
				v-for="(result, i) in sortedResources"
				:key="result.value"
				:class="{
					[$style.resourceItem]: true,
					[$style.selected]: result.value === value,
					[$style.hovering]: hoverIndex === i,
				}"
				class="ph-no-capture"
				@click="() => onItemClick(result.value)"
				@mouseenter="() => onItemHover(i)"
				@mouseleave="() => onItemHoverLeave()"
				:ref="`item-${i}`"
			>
				<div :class="$style.resourceNameContainer">
					<span>{{ result.name }}</span>
				</div>
				<div :class="$style.urlLink">
					<font-awesome-icon
						v-if="showHoverUrl && result.url && hoverIndex === i"
						icon="external-link-alt"
						:title="result.linkAlt || $locale.baseText('resourceLocator.mode.list.openUrl')"
						@click="openUrl($event, result.url)"
					/>
				</div>
			</div>
			<div v-if="loading && !errorView">
				<div v-for="i in 3" :key="i" :class="$style.loadingItem">
					<n8n-loading :class="$style.loader" variant="p" :rows="1" />
				</div>
			</div>
		</div>
		<template #reference>
			<slot />
		</template>
	</n8n-popover>
</template>

<script lang="ts">
import type { IResourceLocatorResultExpanded } from '@/Interface';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

const SEARCH_BAR_HEIGHT_PX = 40;
const SCROLL_MARGIN_PX = 10;

export default defineComponent({
	name: 'resource-locator-dropdown',
	props: {
		value: {
			type: [String, Number],
		},
		show: {
			type: Boolean,
			default: false,
		},
		resources: {
			type: Array as PropType<IResourceLocatorResultExpanded[]>,
		},
		filterable: {
			type: Boolean,
		},
		loading: {
			type: Boolean,
		},
		filter: {
			type: String,
		},
		hasMore: {
			type: Boolean,
		},
		errorView: {
			type: Boolean,
		},
		filterRequired: {
			type: Boolean,
		},
		width: {
			type: Number,
		},
	},
	data() {
		return {
			hoverIndex: 0,
			showHoverUrl: false,
		};
	},
	mounted() {
		this.$on('keyDown', this.onKeyDown);
	},
	computed: {
		sortedResources(): IResourceLocatorResultExpanded[] {
			const seen = new Set();
			const { selected, notSelected } = this.resources.reduce(
				(acc, item: IResourceLocatorResultExpanded) => {
					if (seen.has(item.value)) {
						return acc;
					}
					seen.add(item.value);

					if (this.value && item.value === this.value) {
						acc.selected = item;
					} else {
						acc.notSelected.push(item);
					}

					return acc;
				},
				{
					selected: null as IResourceLocatorResultExpanded | null,
					notSelected: [] as IResourceLocatorResultExpanded[],
				},
			);

			if (selected) {
				return [selected, ...notSelected];
			}

			return notSelected;
		},
	},
	methods: {
		openUrl(event: MouseEvent, url: string) {
			event.preventDefault();
			event.stopPropagation();

			window.open(url, '_blank');
		},
		onKeyDown(e: KeyboardEvent) {
			const containerRef = this.$refs.resultsContainer as HTMLElement | undefined;

			if (e.key === 'ArrowDown') {
				if (this.hoverIndex < this.sortedResources.length - 1) {
					this.hoverIndex++;

					const itemRefs = this.$refs[`item-${this.hoverIndex}`] as HTMLElement[] | undefined;
					if (containerRef && Array.isArray(itemRefs) && itemRefs.length === 1) {
						const item = itemRefs[0];
						if (
							item.offsetTop + item.clientHeight >
							containerRef.scrollTop + containerRef.offsetHeight
						) {
							const top = item.offsetTop - containerRef.offsetHeight + item.clientHeight;
							containerRef.scrollTo({ top });
						}
					}
				}
			} else if (e.key === 'ArrowUp') {
				if (this.hoverIndex > 0) {
					this.hoverIndex--;

					const searchOffset = this.filterable ? SEARCH_BAR_HEIGHT_PX : 0;
					const itemRefs = this.$refs[`item-${this.hoverIndex}`] as HTMLElement[] | undefined;
					if (containerRef && Array.isArray(itemRefs) && itemRefs.length === 1) {
						const item = itemRefs[0];
						if (item.offsetTop <= containerRef.scrollTop + searchOffset) {
							containerRef.scrollTo({ top: item.offsetTop - searchOffset });
						}
					}
				}
			} else if (e.key === 'Enter') {
				this.$emit('input', this.sortedResources[this.hoverIndex].value);
			}
		},
		onFilterInput(value: string) {
			this.$emit('filter', value);
		},
		onClickOutside() {
			this.$emit('hide');
		},
		onItemClick(selected: string) {
			this.$emit('input', selected);
		},
		onItemHover(index: number) {
			this.hoverIndex = index;

			setTimeout(() => {
				if (this.hoverIndex === index) {
					this.showHoverUrl = true;
				}
			}, 250);
		},
		onItemHoverLeave() {
			this.showHoverUrl = false;
		},
		onResultsEnd() {
			if (this.loading || !this.hasMore) {
				return;
			}

			const containerRef = this.$refs.resultsContainer as HTMLElement | undefined;
			if (containerRef) {
				const diff =
					containerRef.offsetHeight - (containerRef.scrollHeight - containerRef.scrollTop);
				if (diff > -SCROLL_MARGIN_PX && diff < SCROLL_MARGIN_PX) {
					this.$emit('loadMore');
				}
			}
		},
	},
	watch: {
		show(toShow) {
			if (toShow) {
				this.hoverIndex = 0;
				this.showHoverUrl = false;
			}
			setTimeout(() => {
				if (toShow && this.filterable && this.$refs.search) {
					(this.$refs.search as HTMLElement).focus();
				}
			}, 0);
		},
		loading() {
			setTimeout(this.onResultsEnd, 0); // in case of filtering
		},
	},
});
</script>

<style lang="scss" module>
:root .popover {
	--content-height: 236px;
	padding: 0;
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
</style>
