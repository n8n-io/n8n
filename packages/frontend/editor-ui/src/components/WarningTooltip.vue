<template>
	<span>
		<n8n-tooltip content=" " placement="top">
			<template #content>
				<slot />
			</template>
			<n8n-icon :class="$style['icon']" icon="triangle-alert" />
		</n8n-tooltip>
	</span>
</template>

<style lang="scss" module>
.icon {
	font-size: 14px;
	height: 18px;
	color: $warning-tooltip-color;
}
</style>
