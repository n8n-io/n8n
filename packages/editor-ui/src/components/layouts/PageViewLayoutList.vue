<template>
	<div :class="$style.wrapper">
		<div :class="$style.list">
			<div :class="$style.header" v-if="$slots.header">
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
	align-items: stretch;
	width: 100%;
	height: 100%;
}

.header {
	//display: flex;
	//flex: 0 0 auto;
	//width: 100%;
	//height: auto;
}

.body {
	overflow: auto;
}
</style>
