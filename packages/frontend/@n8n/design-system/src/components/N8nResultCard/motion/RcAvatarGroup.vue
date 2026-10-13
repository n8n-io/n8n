<script lang="ts" setup>
import { ref } from 'vue';

import RcAvatar from './RcAvatar.vue';
import { readNumber, readToken } from './motionTokens';

/**
 * Avatar group hover (transitions.dev): the hovered avatar lifts and grows a
 * touch; its neighbours lift less with an exponential falloff, so the row
 * ripples under the pointer. Leaving settles everyone back on a springy curve.
 */
const props = withDefaults(
	defineProps<{ people: Array<{ name: string; initials?: string }>; size?: number }>(),
	{ size: 28 },
);

const group = ref<HTMLElement | null>(null);
const shifts = ref<Array<{ shift: string; scale: string }>>([]);
const timing = ref('');

function setShifts(active: number | null) {
	const el = group.value;
	const lift = readNumber(el, '--rc-avatar-lift', -4);
	const falloff = readNumber(el, '--rc-avatar-falloff', 0.45);
	const scale = readNumber(el, '--rc-avatar-scale', 1.05);
	timing.value =
		active === null
			? readToken(el, '--rc-avatar-ease-out', 'cubic-bezier(0.34, 3.85, 0.64, 1)')
			: readToken(el, '--rc-avatar-ease-in', 'cubic-bezier(0.22, 1, 0.36, 1)');
	shifts.value = props.people.map((_, index) => {
		if (active === null) return { shift: '0px', scale: '1' };
		const distance = Math.abs(index - active);
		return {
			shift: `${(lift * Math.pow(falloff, distance)).toFixed(3)}px`,
			scale: index === active ? String(scale) : '1',
		};
	});
}
</script>

<template>
	<span ref="group" :class="$style.group" @mouseleave="setShifts(null)">
		<span
			v-for="(person, index) in people"
			:key="index"
			:class="$style.avatar"
			:style="{
				'--shift': shifts[index]?.shift ?? '0px',
				'--scale-active': shifts[index]?.scale ?? '1',
				transitionTimingFunction: timing || undefined,
			}"
			@mouseenter="setShifts(index)"
		>
			<RcAvatar :name="person.name" :initials="person.initials" :size="size" :class="$style.av" />
		</span>
	</span>
</template>

<style lang="scss" module>
.group {
	display: flex;
	flex: none;
	padding-left: 2px;
}
.avatar {
	display: inline-flex;
	position: relative;
	transform-origin: center;
	transform: translateY(var(--shift, 0px)) scale(var(--scale-active, 1));
	transition: transform var(--rc-avatar-dur, 320ms)
		var(--rc-avatar-ease-in, cubic-bezier(0.22, 1, 0.36, 1));
	will-change: transform;
	& + & {
		margin-left: -6px;
	}
}
.av {
	box-shadow:
		0 0 0 2px var(--rc-surface),
		inset 0 0 0 1px rgba(0, 0, 0, 0.02);
}

@media (prefers-reduced-motion: reduce) {
	.avatar {
		transition: none !important;
		transform: none !important;
	}
}
</style>
