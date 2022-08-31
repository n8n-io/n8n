<template>
	<el-popover
		placement="bottom"
		width="318"
		:popper-class="$style.popover"
		:value="show"
		trigger="manual"
	>
		<div :class="$style.searchInput" v-if="filterable" @keydown="onKeyDown">
			<n8n-input :value="filter" @input="onFilterInput" @blur="onSearchBlur" ref="search">
				<font-awesome-icon icon="search" slot="prefix" />
			</n8n-input>
		</div>
		<div :class="{[$style.container]: true, [$style.pushDownResults]: filterable}">
			<div
				v-for="(result, i) in sortedResources"
				:key="result.value"
				:class="{ [$style.resourceItem]: true, [$style.selected]: result.value === selected, [$style.hovering]: hoverIndex === i }"
				@click="() => onItemClick(result.value)"
				@mouseenter="() => onItemHover(i)"
			>
				{{ result.name }}
			</div>
			<div v-if="loading">
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
	},
	data() {
		return {
			hoverIndex: 0,
		};
	},
	computed: {
		sortedResources(): IResourceLocatorResult[] {
			if (!this.selected) {
				return this.resources;
			}

			const notSelected = this.resources.filter((item: IResourceLocatorResult) => this.selected !== item.value);
			const selectedResource = this.resources.find((item: IResourceLocatorResult) => this.selected === item.value);

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
		onKeyDown(e: KeyboardEvent) {
			if (e.key === 'ArrowDown') {
				if (this.hoverIndex < this.sortedResources.length - 1) {
					this.hoverIndex++;
				}
			}
			else if (e.key === 'ArrowUp') {
				if (this.hoverIndex > 0) {
					this.hoverIndex--;
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
	},
	watch: {
		show(toShow) {
			setTimeout(() => {
				if (toShow && this.filterable && this.$refs.search) {
					(this.$refs.search as HTMLElement).focus();
				}
			}, 0);
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
</style>
