<template>
	<span class="n8n-spinner">
		<div v-if="type === 'ring'" class="lds-ring">
			<div></div>
			<div></div>
			<div></div>
			<div></div>
		</div>
		<N8nIcon v-else icon="spinner" :size="size" spin />
	</span>
</template>

<script lang="ts" setup>
import type { TextSize } from 'n8n-design-system/types/text';
import N8nIcon from '../N8nIcon';

const TYPE = ['dots', 'ring'] as const;

interface SpinnerProps {
	size?: Exclude<TextSize, 'xsmall' | 'mini' | 'xlarge'>;
	type?: (typeof TYPE)[number];
}

defineOptions({ name: 'N8nSpinner' });
withDefaults(defineProps<SpinnerProps>(), {
	type: 'dots',
});
</script>

<style lang="scss">
.lds-ring {
	display: inline-block;
	position: relative;
	width: 48px;
	height: 48px;
}
.lds-ring div {
	box-sizing: border-box;
	display: block;
	position: absolute;
	width: 48px;
	height: 48px;
	border: 4px solid var(--color-foreground-xlight);
	border-radius: 50%;
	animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
	border-color: var(--color-primary) transparent transparent transparent;
}
.lds-ring div:nth-child(1) {
	animation-delay: -0.45s;
}
.lds-ring div:nth-child(2) {
	animation-delay: -0.3s;
}
.lds-ring div:nth-child(3) {
	animation-delay: -0.15s;
}
@keyframes lds-ring {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
</style>
