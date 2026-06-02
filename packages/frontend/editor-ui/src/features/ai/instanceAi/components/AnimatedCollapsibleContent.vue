<script lang="ts" setup>
import { CollapsibleContent } from 'reka-ui';

const props = withDefaults(
	defineProps<{
		mode?: 'height' | 'measured';
		open?: boolean;
	}>(),
	{
		mode: 'height',
		open: false,
	},
);

function scheduleFrame(callback: () => void) {
	if (typeof window.requestAnimationFrame === 'function') {
		window.requestAnimationFrame(callback);
		return;
	}

	window.setTimeout(callback, 0);
}

function parseTransitionTime(value: string): number[] {
	return value.split(',').map((time) => {
		const trimmed = time.trim();
		const value = Number.parseFloat(trimmed);
		if (Number.isNaN(value)) return 0;

		return trimmed.endsWith('ms') ? value : value * 1000;
	});
}

function getTransitionDuration(element: HTMLElement): number {
	const style = window.getComputedStyle(element);
	const durations = parseTransitionTime(style.transitionDuration);
	const delays = parseTransitionTime(style.transitionDelay);

	return Math.max(
		...durations.map((duration, index) => duration + (delays[index % delays.length] ?? 0)),
		0,
	);
}

function waitForHeightTransition(element: HTMLElement, done: () => void) {
	let isDone = false;

	const finish = () => {
		if (isDone) return;
		isDone = true;
		element.removeEventListener('transitionend', onTransitionEnd);
		done();
	};

	const onTransitionEnd = (event: TransitionEvent) => {
		if (event.target === element && event.propertyName === 'height') {
			finish();
		}
	};

	element.addEventListener('transitionend', onTransitionEnd);
	window.setTimeout(finish, getTransitionDuration(element) + 50);
}

function beforeMeasuredEnter(element: Element) {
	const content = element as HTMLElement;
	content.style.height = '0';
	content.style.opacity = '0';
	content.style.overflow = 'hidden';
}

function measuredEnter(element: Element, done: () => void) {
	const content = element as HTMLElement;
	waitForHeightTransition(content, done);
	scheduleFrame(() => {
		content.style.height = `${content.scrollHeight}px`;
		content.style.opacity = '1';
	});
}

function afterMeasuredEnter(element: Element) {
	const content = element as HTMLElement;
	content.style.height = 'auto';
	content.style.opacity = '';
	content.style.overflow = '';
}

function beforeMeasuredLeave(element: Element) {
	const content = element as HTMLElement;
	content.style.height = `${content.scrollHeight}px`;
	content.style.opacity = '1';
	content.style.overflow = 'hidden';
}

function measuredLeave(element: Element, done: () => void) {
	const content = element as HTMLElement;
	waitForHeightTransition(content, done);
	scheduleFrame(() => {
		content.style.height = '0';
		content.style.opacity = '0';
	});
}

function afterMeasuredLeave(element: Element) {
	const content = element as HTMLElement;
	content.style.height = '';
	content.style.opacity = '';
	content.style.overflow = '';
}
</script>

<template>
	<Transition
		v-if="mode === 'measured'"
		@before-enter="beforeMeasuredEnter"
		@enter="measuredEnter"
		@after-enter="afterMeasuredEnter"
		@before-leave="beforeMeasuredLeave"
		@leave="measuredLeave"
		@after-leave="afterMeasuredLeave"
	>
		<div v-show="props.open" :class="[$style.content, $style.measured]">
			<slot />
		</div>
	</Transition>

	<CollapsibleContent v-else :class="[$style.content, $style.height]">
		<slot />
	</CollapsibleContent>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.content {
	overflow: hidden;
}

.height {
	&[data-state='open'] {
		--animation--collapsible-slide--duration: 0.2s;
		@include motion.collapsible-slide-down;
	}

	&[data-state='closed'] {
		--animation--collapsible-slide--duration: 0.2s;
		@include motion.collapsible-slide-up;
	}
}

.measured {
	transition-property: height, opacity;
	transition-duration: var(--duration--base), var(--duration--snappy);
	transition-timing-function: var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition-duration: 0s;
	}
}
</style>
