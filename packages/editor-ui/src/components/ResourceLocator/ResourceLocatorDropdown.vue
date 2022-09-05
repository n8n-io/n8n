<template>
	<el-popover
		placement="bottom"
		width="318"
		:popper-class="$style.popover"
		:value="show"
		trigger="manual"
	>
		<div :class="$style.messageContainer" v-if="errorView">
			<slot name="error"></slot>
		</div>
		<div :class="$style.searchInput" v-if="filterable && !errorView" @keydown="onKeyDown">
			<n8n-input :value="filter" :clearable="true" @input="onFilterInput" @blur="onSearchBlur" ref="search">
				<font-awesome-icon icon="search" slot="prefix" />
			</n8n-input>
		</div>
		<div v-if="filterRequired && !filter && !errorView && !loading" :class="$style.searchRequired">
			{{ $locale.baseText('resourceLocator.listModeDropdown.searchRequired') }}
		</div>
		<div :class="$style.messageContainer" v-else-if="!errorView && sortedResources.length === 0 && !loading">
			{{ $locale.baseText('resourceLocator.listModeDropdown.noResults') }}
		</div>
		<div v-else-if="!errorView" ref="resultsContainer" :class="{[$style.container]: true, [$style.pushDownResults]: filterable}" @scroll="onResultsEnd">
			<div
				v-for="(result, i) in sortedResources"
				:key="result.value"
				:class="{ [$style.resourceItem]: true, [$style.selected]: result.value === selected, [$style.hovering]: hoverIndex === i }"
				@click="() => onItemClick(result.value)"
				@mouseenter="() => onItemHover(i)"
				@mouseleave="() => onItemHoverLeave()"
				:ref="`item-${i}`"
			>
				<span @mouseenter="onNameHover(i)" @mouseleave="onNameHoverLeave(i)">{{ result.name }}</span>
				<font-awesome-icon
					v-if="showHoverUrl && result.url && nameHoverIndex === i"
					icon="external-link-alt"
					:class="$style.urlLink"
					:title="$locale.baseText('resourceLocator.listModeDropdown.openUrl')"
					@click="openUrl($event, result.url)"
				/>
			</div>
			<div v-if="loading && !errorView">
				<div v-for="(_, i) in 3" :key="i" :class="$style.loadingItem">
					<n8n-loading :class="$style.loader" variant="p" :rows="1" />
				</div>
			</div>
		</div>
		<slot slot="reference" />
	</el-popover>
</template>

<script lang="ts">
import { IResourceLocatorResult } from 'n8n-workflow';
import Vue, { PropType } from 'vue';

const SEARCH_BAR_HEIGHT_PX = 40;
const SCROLL_MARGIN_PX = 10;

export default Vue.extend({
	name: 'ResourceLocatorDropdown',
	props: {
		show: {
			type: Boolean,
			default: false,
		},
		resources: {
			type: Array as PropType<IResourceLocatorResult[]>,
		},
		selected: {
			type: String,
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
	},
	data() {
		return {
			hoverIndex: 0,
			nameHoverIndex: -1,
			showHoverUrl: false,
		};
	},
	mounted() {
		this.$on('keyDown', this.onKeyDown);
	},
	computed: {
		sortedResources(): IResourceLocatorResult[] {
			if (!this.selected) {
				return this.resources;
			}

			const seen = new Set();
			// todo simplify into one loop
			const deduped = this.resources.filter((item) => {
				if (seen.has(item.value)) {
					return false;
				}
				seen.add(item.value);
				return true;
			});
			const notSelected = deduped.filter((item: IResourceLocatorResult) => this.selected !== item.value);
			const selectedResource = deduped.find((item: IResourceLocatorResult) => this.selected === item.value);

			if (selectedResource) {
				return [
					selectedResource,
					...notSelected,
				];
			}

			return notSelected;
		},
	},
	methods: {
		openUrl(event: MouseEvent ,url: string) {
			event.preventDefault();
			event.stopPropagation();

			window.open(url, '_blank');
		},
		onNameHover(hoverIndex: number) {
			this.nameHoverIndex = hoverIndex;
			setTimeout(() => {
				if (this.nameHoverIndex === hoverIndex) {
					this.showHoverUrl = true;
				}
			}, 250);
		},
		onNameHoverLeave() {
			if (!this.showHoverUrl) {
				this.nameHoverIndex = -1;
			}
		},
		onKeyDown(e: KeyboardEvent) {
			const container = this.$refs.resultsContainer as HTMLElement;

			if (e.key === 'ArrowDown') {
				if (this.hoverIndex < this.sortedResources.length - 1) {
					this.hoverIndex++;

					const items = this.$refs[`item-${this.hoverIndex}`] as HTMLElement[];
					if (container && Array.isArray(items) && items.length === 1) {
						const item = items[0];
						if ((item.offsetTop + item.clientHeight) > (container.scrollTop + container.offsetHeight)) {
							const top = item.offsetTop - container.offsetHeight + item.clientHeight;
							container.scrollTo({ top });
						}
					}
				}
			}
			else if (e.key === 'ArrowUp') {
				if (this.hoverIndex > 0) {
					this.hoverIndex--;

					const searchOffset = this.filterable ? SEARCH_BAR_HEIGHT_PX : 0;
					const items = this.$refs[`item-${this.hoverIndex}`] as HTMLElement[];
					if (container && Array.isArray(items) && items.length === 1) {
						const item = items[0];
						if (item.offsetTop <= container.scrollTop + searchOffset) {
							container.scrollTo({ top: item.offsetTop - searchOffset });
						}
					}
				}
			}
			else if (e.key === 'Enter') {
				this.$emit('selected', this.sortedResources[this.hoverIndex].value);
			}

		},
		onFilterInput(value: string) {
			this.$emit('filter', value);
		},
		onSearchBlur() {
			this.$emit('hide');
		},
		onItemClick(selected: string) {
			this.$emit('selected', selected);
		},
		onItemHover(index: number) {
			this.hoverIndex = index;
		},
		onItemHoverLeave() {
			this.nameHoverIndex = -1;
			this.showHoverUrl = false;
		},
		onResultsEnd() {
			if (this.loading || !this.hasMore) {
				return;
			}

			const container = this.$refs.resultsContainer as HTMLElement;
			if (container) {
				const diff = container.offsetHeight - (container.scrollHeight - container.scrollTop);
				if (diff > -(SCROLL_MARGIN_PX)  && diff < SCROLL_MARGIN_PX) {
					this.$emit('loadMore');
				}
			}
		},
	},
	watch: {
		show(toShow) {
			if (toShow) {
				this.hoverIndex = 0;
				this.nameHoverIndex = -1;
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
.popover {
	padding: 0;
	border: var(--border-base);
}

.pushDownResults {
	padding-top: 40px;
}

.container {
	position: relative;
	max-height: 236px;
	overflow: scroll;
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
	position: absolute;
	top: 0;
	width: 316px;
	z-index: 1;
}

.selected {
	color: var(--color-primary);
}

.resourceItem {
	padding: var(--spacing-2xs) var(--spacing-xs);
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
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
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	margin-left: var(--spacing-2xs);

	&:hover {
		color: var(--color-primary);
	}
}
</style>
