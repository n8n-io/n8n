<template>
	<div class="subcategory-panel">
		<div class="subcategory-header">
			<div class="clickable" @click="onBackArrowClick">
				<font-awesome-icon class="back-arrow" icon="arrow-left" />
			</div>
			<span>
				{{ $locale.baseText(`nodeCreator.subcategoryNames.${subcategoryName}`) }}
			</span>
		</div>

		<div class="scrollable">
			<ItemIterator
				:elements="elements"
				:activeIndex="activeIndex"
				@selected="$emit('selected', $event)"
				@dragstart="$emit('dragstart', $event)"
				@dragend="$emit('dragend', $event)"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import camelcase from 'lodash.camelcase';
import Vue from 'vue';

import ItemIterator from './ItemIterator.vue';

export default Vue.extend({
	name: 'SubcategoryPanel',
	components: {
		ItemIterator,
	},
	props: ['title', 'elements', 'activeIndex'],
	computed: {
		subcategoryName() {
			return camelcase(this.title);
		},
	},
	methods: {
		onBackArrowClick() {
			this.$emit('close');
		},
	},
});
</script>

<style lang="scss" scoped>
.subcategory-panel {
	position: absolute;
	background: $node-creator-search-background-color;
	z-index: 100;
	height: 100%;
	width: 100%;

	&:before {
		box-sizing: border-box;
		content: ' ';
		border-left: 1px solid $node-creator-border-color;
		width: 1px;
		position: absolute;
		height: 100%;
	}
}

.subcategory-header {
	border: $node-creator-border-color solid 1px;
	height: 50px;
	background-color: $node-creator-subcategory-panel-header-bacground-color;

	font-size: 18px;
	font-weight: 600;
	line-height: 16px;

	display: flex;
	align-items: center;
	padding: 11px 15px;
}

.back-arrow {
	color: $node-creator-arrow-color;
	height: 16px;
	width: 16px;
	margin-right: 24px;
}

.scrollable {
	overflow-y: auto;
	overflow-x: visible;
	height: calc(100% - 100px);

	&::-webkit-scrollbar {
		display: none;
	}

	> div {
		padding-bottom: 30px;
	}
}

</style>
