<template>
	<span :class="['n8n-avatar', $style.container]" v-bind="$attrs">
		<Avatar
			v-if="firstName"
			:size="getSize(size)"
			:name="firstName + ' ' + lastName"
			variant="marble"
			:colors="getColors(colors)"
		/>
		<div v-else :class="[$style.empty, $style[size]]"></div>
		<span v-if="firstName" :class="$style.initials">{{ initials }}</span>
	</span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import Avatar from 'vue-boring-avatars';
import { getInitials } from '../../utils/labelUtil';

interface AvatarProps {
	firstName: string;
	lastName: string;
	size?: string;
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

const initials = computed(() => getInitials(`${props.firstName} ${props.lastName}`));

const getColors = (colors: string[]): string[] => {
	const style = getComputedStyle(document.body);
	return colors.map((color: string) => style.getPropertyValue(color));
};

const sizes: { [size: string]: number } = {
	small: 28,
	large: 48,
	medium: 40,
};
const getSize = (size: string): number => sizes[size];
</script>

<style lang="scss" module>
.container {
	position: relative;
	display: inline-flex;
	justify-content: center;
	align-items: center;
}

.empty {
	border-radius: 50%;
	background-color: var(--color-foreground-dark);
	opacity: 0.3;
}

.initials {
	position: absolute;
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: var(--color-avatar-font);
	text-shadow: 0px 1px 6px rgba(25, 11, 9, 0.3);
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
