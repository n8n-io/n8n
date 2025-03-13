<template>
	<div :class="$style['gift-icon']">
		<font-awesome-icon icon="gift" />
		<div :class="$style['notification']">
			<div></div>
		</div>
	</div>
</template>

<style lang="scss" module>
.gift-icon {
	display: flex;
	position: relative;

	svg {
		margin-right: 0 !important;
	}

	.notification {
		height: 0.47em;
		width: 0.47em;
		border-radius: 50%;
		color: $gift-notification-active-color;
		position: absolute;
		background-color: $gift-notification-outer-color;
		right: -0.3em;
		display: flex;
		align-items: center;
		justify-content: center;
		top: -0.148em;

		div {
			height: 0.36em;
			width: 0.36em;
			background-color: $gift-notification-inner-color;
			border-radius: 50%;
		}
	}
}
</style>
