<template>
	<el-popover
		placement="bottom"
		width="318"
		:popper-class="$style.popover"
		:value="show"
		trigger="manual"
	>
		<div :class="$style.searchInput" v-if="filterable">
			<n8n-input v-model="filter" @input="onFilter" @blur="onSearchBlur" ref="search">
				<font-awesome-icon icon="search" slot="prefix" />
			</n8n-input>
		</div>
		<div :class="{[$style.container]: true, [$style.pushDownResults]: filterable}">
			<div
				v-for="result in resources"
				:key="result.value"
				:class="{ [$style.resourceItem]: true, [$style.selected]: result.value === selected }"
				@click="() => onItemClick(result.value)"
			>
				{{ result.name }}
			</div>
			<div
				v-for="result in resources"
				:key="result.value"
				:class="{ [$style.resourceItem]: true, [$style.selected]: result.value === selected }"
				@click="() => onItemClick(result.value)"
			>
				{{ result.name }}
			</div>
		</div>
		<slot slot="reference" />
	</el-popover>
</template>

<script lang="ts">
import { IResourceLocatorResult } from '@/Interface';
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
	},
	data() {
		return {
			filter: '',
		};
	},
	methods: {
		onFilter() {
			this.$emit('filter', this.filter);
		},
		onSearchBlur() {
			this.$emit('hide');
		},
		onItemClick(selected: string) {
			this.$emit('selected', selected);
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
	cursor: pointer;

	&:hover {
		background-color: var(--color-background-base);
	}
}
</style>
