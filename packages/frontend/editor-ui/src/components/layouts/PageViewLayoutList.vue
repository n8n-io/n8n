<script lang="ts" setup>
interface Props {
	overflow?: boolean;
}

defineProps<Props>();
</script>

<template>
	<div :class="{ [$style.wrapper]: true, [$style.overflow]: overflow }">
		<div :class="$style.list">
			<div v-if="$slots.header" :class="$style.header">
				<slot name="header" />
			</div>
			<div :class="$style.body">
				<slot />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: grid;
	height: 100%;
}

.overflow {
	.list {
		.body {
			overflow: auto;
		}
	}
}

.list {
	display: grid;
	grid-template-rows: auto 1fr;
	height: 100%;
	.body {
		position: relative;
		height: 100%;
	}
}
</style>
