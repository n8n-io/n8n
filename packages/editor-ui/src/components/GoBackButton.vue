<template>
	<div :class="$style.wrapper" @click="navigateTo">
		<font-awesome-icon :class="$style.icon" icon="arrow-left" />
		<div :class="$style.text" v-text="$locale.baseText('template.buttons.goBackButton')" />
	</div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';

const routeHasHistory = ref(false);
const router = useRouter();

const navigateTo = () => {
	if (routeHasHistory.value) router.go(-1);
	else void router.push({ name: VIEWS.TEMPLATES });
};

onMounted(() => {
	routeHasHistory.value = !!window.history.state;
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