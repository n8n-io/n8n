<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui';
</script>

<template>
	<PopoverRoot>
		<PopoverTrigger :as-child="true">
			<slot name="trigger"></slot>
		</PopoverTrigger>
		<PopoverPortal>
			<PopoverContent side="bottom" :side-offset="5" :class="$style.popoverContent">
				<slot name="content" />
			</PopoverContent>
		</PopoverPortal>
	</PopoverRoot>
</template>

<style lang="scss" module>
.popoverContent {
	border-radius: var(--border-radius-base);
	padding: 16px;
	width: 260px;
	background-color: var(--color-foreground-xlight);
	border: var(--border-base);
	box-shadow:
		rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
		rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;
	animation-duration: 400ms;
	animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
	will-change: transform, opacity;
}

.popoverContent[data-state='open'][data-side='top'] {
	animation-name: slideDownAndFade;
}

.popoverContent[data-state='open'][data-side='right'] {
	animation-name: slideLeftAndFade;
}

.popoverContent[data-state='open'][data-side='bottom'] {
	animation-name: slideUpAndFade;
}

.popoverContent[data-state='open'][data-side='left'] {
	animation-name: slideRightAndFade;
}

@keyframes slideUpAndFade {
	from {
		opacity: 0;
		transform: translateY(2px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideRightAndFade {
	from {
		opacity: 0;
		transform: translateX(-2px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

@keyframes slideDownAndFade {
	from {
		opacity: 0;
		transform: translateY(-2px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideLeftAndFade {
	from {
		opacity: 0;
		transform: translateX(2px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}
</style>
