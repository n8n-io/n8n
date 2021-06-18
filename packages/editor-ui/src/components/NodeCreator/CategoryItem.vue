<template functional>
	<div :class="$style.category">
		<span :class="$style.name">{{ props.item.category }}</span>
		<font-awesome-icon
			:class="$style.arrow"
			icon="chevron-down"
			v-if="props.item.properties.expanded"
		/>
		<font-awesome-icon :class="$style.arrow" icon="chevron-up" v-else />
	</div>
</template>

<script lang="ts">
export default {
	props: ['item'],
};
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