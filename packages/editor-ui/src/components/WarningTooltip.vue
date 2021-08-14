<template functional>
	<el-tooltip effect="light" content=" " placement="top" >
		<div slot="content"><slot /></div>
		<font-awesome-icon :class="$style['icon']" icon="exclamation-triangle"></font-awesome-icon>
	</el-tooltip>
</template>


<style lang="scss" module>
	.icon {
		font-size: 14px;
		height: 18px;
		color: $--warning-tooltip-color;
	}
</style>