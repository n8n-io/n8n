<template>
	<div :class="$style.wrapper" @click="navigateTo">
		<font-awesome-icon :class="$style.icon" icon="arrow-left" />
		<div :class="$style.text" v-text="$locale.baseText('template.buttons.goBackButton')" />
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { VIEWS } from '@/constants';

export default defineComponent({
	name: 'GoBackButton',
	data() {
		return {
			routeHasHistory: false,
		};
	},
	methods: {
		navigateTo() {
			if (this.routeHasHistory) this.$router.go(-1);
			else void this.$router.push({ name: VIEWS.TEMPLATES });
		},
	},
	mounted() {
		window.history.state ? (this.routeHasHistory = true) : (this.routeHasHistory = false);
	},
});
</script>

<style lang="scss" module>
.wrapper {
	display: flex;
	align-items: center;
	cursor: pointer;

	&:hover {
		.icon,
		.text {
			color: var(--color-primary);
		}
	}
}

.icon {
	margin-right: var(--spacing-2xs);
	color: var(--color-foreground-dark);
	font-size: var(--font-size-m);
}

.text {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
	color: var(--color-text-base);
}
</style>
