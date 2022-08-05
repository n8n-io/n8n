<template>
	<span :class="$style.trigger">
		<svg width="36px" height="36px" viewBox="0 0 36 36" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
				<title>Trigger node</title>
				<g id="/integrations-(V1-feature)" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
						<g id="Individual-node-view" transform="translate(-304.000000, -137.000000)" fill-rule="nonzero">
								<g id="left-column" transform="translate(120.000000, 131.000000)">
										<g id="trigger-badge" transform="translate(178.000000, 0.000000)">
												<g id="trigger-icon" transform="translate(6.857143, 6.857143)">
														<g id="Icon" transform="translate(8.571429, 0.000000)" fill="#FF6150">
																<polygon id="Icon-Path" points="7.14285714 21.4285714 0 21.4285714 10 1.42857143 10 12.8571429 17.1428571 12.8571429 7.14285714 32.8571429"></polygon>
														</g>
														<rect id="ViewBox" x="0" y="0" width="34.2857143" height="34.2857143"></rect>
												</g>
										</g>
								</g>
						</g>
				</g>
		</svg>
	</span>
</template>

<script lang="ts">
export default {
	name: 'TriggerIcon',
};
</script>

<style lang="scss" module>
.trigger {
	background-color: $--trigger-icon-background-color;
	border: 1px solid $--trigger-icon-border-color;
	border-radius: 4px;
	display: inline-flex;

	> svg {
		width: 100%;
		height: 100%;
	}
}

</style>
