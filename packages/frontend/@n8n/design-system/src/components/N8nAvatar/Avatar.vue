<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import Avatar from 'vue-boring-avatars';

import { AVATAR_SIZES, type AvatarSize } from './avatarSizes';
import type { UserAvatarVariant } from '../../types/user';
import { getInitials } from '../../utils/labelUtil';

interface AvatarProps {
	firstName?: string | null;
	lastName?: string | null;
	size?: AvatarSize;
	/** CSS custom property names (`--color--primary`) or plain CSS colors. */
	colors?: string[];
	/** A picture to show instead of the generated artwork. */
	src?: string | null;
	/** Shown behind `src`, so a picture with transparent pixels sits on a deliberate color. */
	backgroundColor?: string | null;
	/** Shape of the generated artwork. */
	variant?: UserAvatarVariant;
	/**
	 * What the generated artwork is derived from. Defaults to the name, which
	 * gives every user a stable default; a user-designed avatar supplies its own.
	 */
	seed?: string | null;
}

defineOptions({ name: 'N8nAvatar' });
const props = withDefaults(defineProps<AvatarProps>(), {
	firstName: '',
	lastName: '',
	size: 'medium',
	colors: () => [
		'--color--primary',
		'--color--secondary',
		'--avatar--color--accent-1',
		'--avatar--color--accent-2',
		'--color--primary--tint-1',
	],
	src: null,
	backgroundColor: null,
	variant: 'marble',
	seed: null,
});

const name = computed(() => `${props.firstName} ${props.lastName}`.trim());
const initials = computed(() => getInitials(name.value));
const artworkName = computed(() => props.seed ?? name.value);

// A picture that fails to load falls back to the generated artwork rather than a broken image.
const imageFailed = ref(false);
watch(
	() => props.src,
	() => {
		imageFailed.value = false;
	},
);
const showImage = computed(() => !!props.src && !imageFailed.value);

// Initials sit on any generated artwork, default or user-designed; a picture speaks for itself.
const showInitials = computed(() => !showImage.value && !!name.value);

const resolveColors = (colors: string[]): string[] => {
	const style = getComputedStyle(document.body);
	return colors.map((color) =>
		color.startsWith('--') ? style.getPropertyValue(color).trim() || color : color,
	);
};

const pixelSize = computed(() => AVATAR_SIZES[props.size]);
</script>

<template>
	<span :class="['n8n-avatar', $style.container]" v-bind="$attrs">
		<img
			v-if="showImage"
			:src="src ?? undefined"
			:alt="name"
			:width="pixelSize"
			:height="pixelSize"
			:class="$style.image"
			:style="{ backgroundColor: backgroundColor ?? undefined }"
			draggable="false"
			@error="imageFailed = true"
		/>
		<Avatar
			v-else-if="artworkName"
			:size="pixelSize"
			:name="artworkName"
			:variant="variant"
			:colors="resolveColors(colors)"
		/>
		<div v-else :class="[$style.empty, $style[size]]"></div>
		<span v-if="showInitials" :class="[$style.initials, $style[`text-${size}`]]">
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

.image {
	display: block;
	border-radius: 50%;
	object-fit: cover;
	user-select: none;
}

.empty {
	display: block;
	border-radius: 50%;
	background-color: var(--color--foreground--shade-1);
	opacity: 0.3;
}

.initials {
	position: absolute;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--avatar--color--text);
	text-shadow: 0 1px 6px rgba(25, 11, 9, 0.3);
	text-transform: uppercase;
}

.text-xxsmall,
.text-xsmall {
	font-size: 6px;
}

/* Roughly 0.3 of the diameter, the same proportion the smaller sizes land on. */
.text-xlarge {
	font-size: var(--font-size--2xl);
}

.xsmall {
	height: var(--spacing--md);
	width: var(--spacing--md);
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

.xlarge {
	height: 96px;
	width: 96px;
}
</style>
