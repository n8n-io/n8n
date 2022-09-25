<template>
	<div :class="$style.category">
		<span :class="$style.name">
			{{ renderCategoryName(categoryName) }} ({{ nodesCount }})
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
import Vue, { PropType } from 'vue';
import camelcase from 'lodash.camelcase';
import { CategoryName } from '@/plugins/i18n';
import { INodeCreateElement, ICategoriesWithNodes } from '@/Interface';
import { REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER, ALL_NODE_FILTER } from '@/constants';

const nodeTypeCountMapper = {
	[REGULAR_NODE_FILTER]: ['regularCount'],
	[TRIGGER_NODE_FILTER]: ['triggerCount'],
	[ALL_NODE_FILTER]: ['triggerCount', 'regularCount'],
};

export default Vue.extend({
	props: {
		item: {
			type: Object as PropType<INodeCreateElement>,
		},
	},
	computed: {
		selectedType(): "Regular" | "Trigger" | "All" {
			return this.$store.getters['ui/selectedNodeCreatorType'];
		},
		categoriesWithNodes(): ICategoriesWithNodes {
			return this.$store.getters['nodeTypes/categoriesWithNodes'];
		},
		categorizedItems(): INodeCreateElement[] {
			return this.$store.getters['nodeTypes/categorizedItems'];
		},
		categoryName() {
			return camelcase(this.item.category);
		},
		nodesCount(): number {
			const currentCategory = this.categoriesWithNodes[this.item.category];
			const subcategories = Object.keys(currentCategory);

			const count = subcategories.reduce((accu: number, subcategory: string) => {
				const countKeys = nodeTypeCountMapper[this.selectedType];

				for (const countKey of countKeys) {
					accu += currentCategory[subcategory][(countKey as "triggerCount" | "regularCount")];
				}

				return accu;
			}, 0);
			return count;
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
	border-bottom: 1px solid $--node-creator-border-color;
	display: flex;
	text-transform: uppercase;
	cursor: pointer;
}

.name {
	flex-grow: 1;
}

.arrow {
	font-size: 12px;
	width: 12px;
	color: $--node-creator-arrow-color;
}
</style>
