<template>
	<div :class="['workflow-executions-container', $style.container]">
		<div :class="$style.messageContainer">
			<p :class="$style.icon">
				<font-awesome-icon icon="hand-point-left" />
			</p>
			<p :class="$style.message">
				Click on an execution from the list to view it
			</p>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'executions-landing-page',
});
</script>

<style module lang="scss">

.container {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 1;
	width: 100%;
	height: 100%;
	background-color: var(--color-background-light);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.messageContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	max-width: 200px;
	color: var(--color-text-base);
}

.icon {
	font-size: 24px;
	color: var(--color-foreground-dark);
}

</style>
