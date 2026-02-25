<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';

import { N8nIcon } from '@n8n/design-system';
const router = useRouter();
const i18n = useI18n();

const navigateTo = () => {
	void router.back();
};
</script>

<template>
	<div :class="$style.wrapper" @click="navigateTo">
		<N8nIcon :class="$style.icon" icon="arrow-left" />
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
			color: var(--color--primary);
		}
	}
}

.icon {
	margin-right: var(--spacing--2xs);
	color: var(--color--foreground--shade-1);
	font-size: var(--font-size--md);
}

.text {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--color--text);
}
</style>
