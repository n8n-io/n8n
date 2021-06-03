<template functional>
	<div
		:class="{
			container: true,
			[props.item.type]: true,
			clickable: props.clickable,
			active: props.active,
		}"
		@click="listeners['click']"
		>
		<div v-if="props.item.type === 'category'">
			<span class="name">{{ props.item.category }}</span>
			<font-awesome-icon
				class="arrow"
				icon="chevron-down"
				v-if="props.item.expanded"
			/>
			<font-awesome-icon class="arrow" icon="chevron-up" v-else />
		</div>

		<div v-else-if="props.item.type === 'subcategory'">
			<div class="details">
				<div class="title">{{ props.item.subcategory }}</div>
				<div v-if="props.item.description" class="description">
					{{ props.item.description }}
				</div>
			</div>
			<div class="action">
				<font-awesome-icon class="arrow" icon="arrow-right" />
			</div>
		</div>

		<NodeItem
			v-else-if="props.item.type === 'node'"
			:nodeType="props.item.nodeType"
			:bordered="!props.lastNode"
		></NodeItem>
	</div>
</template>

<script lang="ts">
import NodeItem from './NodeItem.vue';
import Vue from 'vue';

Vue.component("NodeItem", NodeItem);

export default {
	props: ['item', 'active', 'clickable', 'lastNode'],
};

</script>


<style lang="scss" scoped>
.container {
	border-left: 1px solid transparent;

	&:hover {
		border-left: 1px solid $--node-creator-item-hover-border-color;
		background-color: $--node-creator-item-hover-background-color;
	}

	&.active {
		border-left: 1px solid $--color-primary !important;
	}
}

.category > div {
	font-size: 11px;
	font-weight: bold;
	letter-spacing: 1px;
	line-height: 11px;
	padding: 10px 0;
	margin-left: 12px;
	margin-right: 12px;
	border-bottom: 1px solid $--node-creator-border-color;
	display: flex;
	text-transform: uppercase;

	.name {
		flex-grow: 1;
	}
}

.subcategory > div {
	display: flex;
	padding: 11px 16px 11px 30px;

	.details {
		flex-grow: 1;
	}

	.title {
		font-size: 14px;
		font-weight: bold;
		letter-spacing: 0;
		line-height: 16px;
		margin-bottom: 3px;
	}

	.description {
		font-size: 11px;
		letter-spacing: 0;
		line-height: 15px;
		font-weight: 400;
	}

	.action {
		display: flex;
		align-items: center;
	}
}

.subcategory + .category,
.node + .category {
	margin-top: 15px;
}

.arrow {
	font-size: 12px;
	width: 12px;
	color: #8d939c;
}

</style>