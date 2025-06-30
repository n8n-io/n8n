<script lang="ts" setup>
import { computed } from 'vue';
import Avatar from 'vue-boring-avatars';

import { getInitials } from '../../utils/labelUtil';

interface AvatarProps {
	firstName?: string | null;
	lastName?: string | null;
	size?: 'xsmall' | 'small' | 'medium' | 'large';
	colors?: string[];
}

defineOptions({ name: 'N8nAvatar' });
const props = withDefaults(defineProps<AvatarProps>(), {
	firstName: '',
	lastName: '',
	size: 'medium',
	colors: () => [
		'--color-primary',
		'--color-secondary',
		'--color-avatar-accent-1',
		'--color-avatar-accent-2',
		'--color-primary-tint-1',
	],
});

const name = computed(() => `${props.firstName} ${props.lastName}`.trim());
const initials = computed(() => getInitials(name.value));

const getColors = (colors: string[]): string[] => {
	const style = getComputedStyle(document.body);
	return colors.map((color: string) => style.getPropertyValue(color));
};

const sizes: { [size: string]: number } = {
	xsmall: 20,
	small: 28,
	large: 48,
	medium: 40,
};
const getSize = (size: string): number => sizes[size];
</script>

<template>
	<span :class="['n8n-avatar', $style.container]" v-bind="$attrs">
		<Avatar
			v-if="name"
			:size="getSize(size)"
			:name="name"
			variant="marble"
			:colors="getColors(colors)"
		/>
		<div v-else :class="[$style.empty, $style[size]]"></div>
		<span v-if="firstName || lastName" :class="[$style.initials, $style[`text-${size}`]]">
			{{ initials }}
		</span>
	</span>
</template>

<style lang="scss" module>
.container {
	position: relative;
	display: inline-flex;
	justify-content: center;
	align-items: center;

	svg {
		border-radius: 50%;
	}
}

.empty {
	display: block;
	border-radius: 50%;
	background-color: var(--color-foreground-dark);
	opacity: 0.3;
}

.initials {
	position: absolute;
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: var(--color-avatar-font);
	text-shadow: 0 1px 6px rgba(25, 11, 9, 0.3);
	text-transform: uppercase;
}

.text-xsmall {
	font-size: 6px;
}

.xsmall {
	height: var(--spacing-m);
	width: var(--spacing-m);
}

.small {
	height: 28px;
	width: 28px;
}

.medium {
	height: 40px;
	width: 40px;
}

.large {
	height: 48px;
	width: 48px;
}
</style>
