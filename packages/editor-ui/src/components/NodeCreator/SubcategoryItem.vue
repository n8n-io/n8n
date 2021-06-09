<template functional>
	<div :class="$style.subcategory">
		<div :class="$style.details">
			<div :class="$style.title">{{ props.item.properties.subcategory }}</div>
			<div v-if="props.item.properties.description" :class="$style.description">
				{{ props.item.properties.description }}
			</div>
		</div>
		<div :class="$style.action">
			<font-awesome-icon :class="$style.arrow" icon="arrow-right" />
		</div>
	</div>
</template>

<script lang="ts">
export default {
	props: ['item'],
};
</script>


<style lang="scss" module>
.subcategory {
	display: flex;
	padding: 11px 16px 11px 30px;
}

.details {
	flex-grow: 1;
	margin-right: 4px;
}

.title {
	font-size: 14px;
	font-weight: bold;
	line-height: 16px;
	margin-bottom: 3px;
}

.description {
	font-size: 11px;
	line-height: 16px;
	font-weight: 400;
	color: $--node-creator-description-color;
}

.action {
	display: flex;
	align-items: center;
}

.arrow {
	font-size: 12px;
	width: 12px;
	color: $--node-creator-arrow-color;
}

</style>