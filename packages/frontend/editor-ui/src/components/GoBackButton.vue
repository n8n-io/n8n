<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';

const router = useRouter();
const i18n = useI18n();

const navigateTo = () => {
	void router.back();
};
</script>

<template>
	<div :class="$style.wrapper" @click="navigateTo">
		<n8n-icon :class="$style.icon" icon="arrow-left" />
		<div :class="$style.text" v-text="i18n.baseText('template.buttons.goBackButton')" />
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
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
	color: var(--color-text-base);
}
</style>
