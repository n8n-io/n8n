<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';

const router = useRouter();
const i18n = useI18n();

const navigateTo = () => {
	// void router.push({ name: VIEWS.TEMPLATES });
	// console.log('process.env => ', process.env);
	// window.location.href(`${process.env.VUE_APP_PLATFORM_URL}/workflows`);
	window.location.replace('https://stage.ciaraai.com/workflows');
};
</script>

<template>
	<div :class="$style.wrapper" @click="navigateTo">
		<font-awesome-icon :class="$style.icon" icon="arrow-left" />
		<div :class="$style.text">Exit</div>
	</div>
</template>

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
	font-size: 24px;
	line-height: var(--font-line-height-loose);
	color: var(--color-text-base);
}
</style>
