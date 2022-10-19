<template>
	<div :class="['pulse', $style.pulseContainer]">
		<div :class="$style.pulse">
			<div :class="$style.pulse2">
				<slot></slot>
			</div>
		</div>
	</div>
</template>

<script>
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-pulse',
});
</script>

<style lang="scss" module>

$--light-pulse-color: hsla(
	var(--color-primary-h),
	var(--color-primary-s),
	var(--color-primary-l),
	0.4
);

$--dark-pulse-color: hsla(
	var(--color-primary-h),
	var(--color-primary-s),
	var(--color-primary-l),
	0
);

.pulseContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 240px;
	width: 100%;
}

.pulse {
	width: 74px;
	height: 74px;
	border-radius: 50%;
	box-shadow: 0 0 0 $--light-pulse-color;
	animation: pulse 6s infinite cubic-bezier(0.33, 1, 0.68, 1);
}

.pulse2 {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 74px;
	height: 74px;
	border-radius: 50%;
	box-shadow: 0 0 0 $--light-pulse-color;
	animation: pulse2 6s infinite cubic-bezier(0.33, 1, 0.68, 1);
}

@keyframes pulse {
	0% {
		-moz-box-shadow: 0 0 0 0 $--light-pulse-color;
		box-shadow: 0 0 0 0 $--light-pulse-color;
	}

	58.33% {
		// 3s
		-moz-box-shadow: 0 0 0 60px $--dark-pulse-color;
		box-shadow: 0 0 0 60px $--dark-pulse-color;
	}

	66.6% {
		// 4s
		-moz-box-shadow: 0 0 0 66px transparent;
		box-shadow: 0 0 0 66px transparent;
	}

	66.7% {
		-moz-box-shadow: 0 0 0 0 transparent;
		box-shadow: 0 0 0 0 transparent;
	}
}

@keyframes pulse2 {
	0% {
		-moz-box-shadow: 0 0 0 0 $--light-pulse-color;
		box-shadow: 0 0 0 0 $--light-pulse-color;
	}

	16.66% {
		// 1s
		-moz-box-shadow: 0 0 0 0 $--light-pulse-color;
		box-shadow: 0 0 0 0 $--light-pulse-color;
	}

	50% {
		// 3s
		-moz-box-shadow: 0 0 0 60px $--dark-pulse-color;
		box-shadow: 0 0 0 60px $--dark-pulse-color;
	}

	83.3% {
		// 5s
		-moz-box-shadow: 0 0 0 66px transparent;
		box-shadow: 0 0 0 66px transparent;
	}

	83.4% {
		-moz-box-shadow: 0 0 0 0 transparent;
		box-shadow: 0 0 0 0 transparent;
	}
}

</style>
