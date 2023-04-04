<template>
	<div :class="$style.wrapper">
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
	display: block;
	width: 100%;
	height: 100%;
}

.list {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;

	.header {
		flex: 0 0 auto;
	}

	.body {
		overflow: hidden;
		flex: 1 1;
	}
}
</style>
