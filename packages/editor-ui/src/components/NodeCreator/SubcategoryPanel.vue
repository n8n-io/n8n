<template>
	<div class="subcategory-panel">
		<div class="border"></div>
		<div class="subcategory-header">
			<div class="clickable" @click="onBackArrowClick">
				<font-awesome-icon class="back-arrow" icon="arrow-left" />
			</div>
			<span>{{ title }}</span>
		</div>

		<div class="scrollable">
			<ItemIterator
				:elements="elements"
				:activeIndex="activeIndex"
				@nodeTypeSelected="nodeTypeSelected"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import ItemIterator from './ItemIterator.vue';

export default Vue.extend({
	name: 'SubcategoryPanel',
	components: {
		ItemIterator,
	},
	props: ['title', 'elements', 'activeIndex'],
	methods: {
		nodeTypeSelected(nodeName: string) {
			this.$emit('nodeTypeSelected', nodeName);
		},
		onBackArrowClick() {
			this.$emit('close');
		},
	},
});
</script>

<style lang="scss" scoped>
.subcategory-panel {
	position: absolute;
	background: $--node-creator-search-background-color;
	z-index: 100;
	height: 100%;
	width: 100%;
}

.subcategory-header {
	border: #dbdfe7 solid 1px;
	height: 50px;
	background-color: #f2f4f8;

	font-size: 18px;
	font-weight: 600;
	line-height: 16px;

	display: flex;
	align-items: center;
	padding: 11px 15px;
}

.back-arrow {
	color: #8d939c;
	height: 16px;
	width: 16px;
	margin-right: 24px;
}

.subcategory-panel .scrollable {
	height: calc(100% - 100px);
}
</style>