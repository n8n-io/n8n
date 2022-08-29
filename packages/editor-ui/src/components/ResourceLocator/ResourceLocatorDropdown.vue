<template>
	<el-popover
		placement="bottom"
		width="318"
		:popper-class="$style.popover"
		:value="show"
		trigger="manual"
	>
		<div :class="$style.searchInput">
			<n8n-input>
				<font-awesome-icon icon="search" slot="prefix" />
			</n8n-input>
		</div>
		<div
			v-for="result in resources"
			:key="result.value"
			:class="{ [$style.resourceItem]: true, [$style.selected]: result.value === selected }"
			@click="() => onItemClick(result.value)"
		>
			{{ result.name }}
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
	},
	methods: {
		onHide() {
			this.$emit('hide');
		},
		onItemClick(selected: string) {
			this.$emit('selected', selected);
		},
	},
});
</script>

<style lang="scss" module>
.popover {
	padding: 0;
	border: var(--border-base);
}

.searchInput {
	border-bottom: vaR(--border-base);
	--input-border-color: none;
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
