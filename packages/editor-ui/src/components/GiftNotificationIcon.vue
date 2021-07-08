<template functional>
	<div class="gift-icon">
		<font-awesome-icon icon="gift"/>
		<div class="notification">
			<div></div>
		</div>
	</div>
</template>

<style lang="scss" module>
	.gift-icon {
		width: 19px;
		height: 16.8px;
		display: flex;
		position: relative;

		svg {
			font-size: 16.8px;
			line-height: 19px;
		}

		.notification {
			height: 8px;
			width: 8px;
			border-radius: 50%;
			color: $--sidebar-active-color;
			position: absolute;
			background-color: $--sidebar-gift-notification-outer-color;
			z-index: 9999;
			left: 75%;
			display: flex;
			align-items: center;
			justify-content: center;
			top: -2.5px;
			
			div {
				height: 6px;
				width: 6px;
				background-color: $--sidebar-gift-notification-inner-color;
				border-radius: 50%;
			}
		}
	}
</style>