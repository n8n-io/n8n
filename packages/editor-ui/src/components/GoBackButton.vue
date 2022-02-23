<template>
	<div :class="$style.wrapper" @click="$router.go(-1)">
		<font-awesome-icon :class="$style.icon" icon="arrow-left" />
		<div :class="$style.text" v-text="$locale.baseText('template.buttons.goBackButton')" />
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({});
</script>

<style lang="scss" module>
.wrapper {
	display: flex;
	align-items: center;
	cursor: pointer;

	&:hover {
		.icon, .text {
			color: var(--color-primary);
		}
	}
}

.icon {
	margin-right: var(--spacing-2xs);
	color: var(--color-foreground-dark);
	font-size: var(--font-size-m);

	&:hover {
		color: var(--color-primary);
	}
}

.text {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
	color: var(--color-text-base);
}
</style>
