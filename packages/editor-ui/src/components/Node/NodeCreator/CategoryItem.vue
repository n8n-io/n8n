<template>
	<div :class="$style.category">
		<span :class="$style.name">
			{{ renderCategoryName(categoryName) }}
		</span>
		<font-awesome-icon
			:class="$style.arrow"
			icon="chevron-down"
			v-if="item.properties.expanded"
		/>
		<font-awesome-icon :class="$style.arrow" icon="chevron-up" v-else />
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import camelcase from 'lodash.camelcase';
import { CategoryName } from '@/plugins/i18n';

export default Vue.extend({
	props: ['item'],
	computed: {
		categoryName() {
			return camelcase(this.item.category);
		},
	},
	methods: {
		renderCategoryName(categoryName: CategoryName) {
			const key = `nodeCreator.categoryNames.${categoryName}` as const;

			return this.$locale.exists(key) ? this.$locale.baseText(key) : categoryName;
		},
	},
});
</script>


<style lang="scss" module>
.category {
	font-size: 11px;
	font-weight: bold;
	letter-spacing: 1px;
	line-height: 11px;
	padding: 10px 0;
	margin: 0 12px;
	border-bottom: 1px solid $node-creator-border-color;
	display: flex;
	text-transform: uppercase;
}

.name {
	flex-grow: 1;
}

.arrow {
	font-size: 12px;
	width: 12px;
	color: $node-creator-arrow-color;
}
</style>
