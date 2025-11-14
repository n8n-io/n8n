<script setup lang="ts">
import { MOBILE_MEDIA_QUERY } from '@/features/ai/chatHub/constants';
import { useMediaQuery } from '@vueuse/core';

const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
</script>

<template>
	<div :class="[$style.component, { [$style.isMobileDevice]: isMobileDevice }]">
		<slot />
	</div>
</template>

<style lang="scss" module>
.component {
	margin: var(--spacing--4xs);
	width: 100%;
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;

	&.isMobileDevice {
		margin: 0;
		border: none;
	}
}
</style>
