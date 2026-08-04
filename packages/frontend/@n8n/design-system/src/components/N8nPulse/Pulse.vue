<script lang="ts" setup>
defineOptions({ name: 'N8nPulse' });
</script>

<template>
	<div :class="['pulse', $style.pulseContainer]">
		<div :class="$style.pulse">
			<div :class="$style.pulse2">
				<slot></slot>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

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
	box-shadow: 0 0 0
		hsla(var(--color--primary--h), var(--color--primary--s), var(--color--primary--l), 0.4);
	@include motion.pulse-glow;
}

.pulse2 {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 74px;
	height: 74px;
	border-radius: 50%;
	box-shadow: 0 0 0
		hsla(var(--color--primary--h), var(--color--primary--s), var(--color--primary--l), 0.4);
	@include motion.pulse-glow-delayed;
}
</style>
