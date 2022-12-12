<template>
	<div :class="{[$style.subcategory]: true, [$style.subcategoryWithIcon]: hasIcon}">
		<node-icon v-if="hasIcon" :class="$style.subcategoryIcon" :nodeType="itemProperties" />
		<div :class="$style.details">
			<div :class="$style.title">
				{{ $locale.baseText(`nodeCreator.subcategoryNames.${subcategoryName}`) }}
			</div>
			<div v-if="item.properties.description" :class="$style.description">
				{{ $locale.baseText(`nodeCreator.subcategoryDescriptions.${subcategoryName}`) }}
			</div>
		</div>
		<div :class="$style.action">
			<font-awesome-icon :class="$style.arrow" icon="arrow-right" />
		</div>
	</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import camelcase from 'lodash.camelcase';

import NodeIcon from '@/components/NodeIcon.vue';
import { INodeCreateElement, ISubcategoryItemProps } from '@/Interface';
export default Vue.extend({
	components: {
		NodeIcon,
	},
	props: {
		item: {
			type: Object as PropType<INodeCreateElement>,
			required: true,
		},
	},
	computed: {
		itemProperties() : ISubcategoryItemProps {
			return this.item.properties as ISubcategoryItemProps;
		},
		subcategoryName(): string {
			return camelcase(this.itemProperties.subcategory);
		},
		hasIcon(): boolean {
			return this.itemProperties.icon !== undefined || this.itemProperties.iconData !== undefined;
		},
	},
});
</script>


<style lang="scss" module>
.subcategoryIcon {
	min-width: 26px;
	max-width: 26px;
	margin-right: 15px;
}

.subcategory {
	display: flex;
	padding: 11px 16px 11px 30px;
	user-select: none;
}

.subcategoryWithIcon {
	margin-left: 15px;
	margin-right: 12px;
	padding: 11px 8px 11px 0;
}

.details {
	flex-grow: 1;
	margin-right: 4px;
}

.title {
	font-size: 14px;
	font-weight: var(--font-weight-bold);
	line-height: 16px;
	margin-bottom: 3px;
}

.description {
	font-size: var(--font-size-2xs);
	line-height: 16px;
	font-weight: 400;
	color: $node-creator-description-color;
}

.action {
	display: flex;
	align-items: center;
	margin-left: var(--spacing-2xs);
}

.arrow {
	font-size: 12px;
	width: 12px;
	color: $node-creator-arrow-color;
}

</style>
