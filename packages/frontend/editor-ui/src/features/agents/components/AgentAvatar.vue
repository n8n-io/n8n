<script setup lang="ts">
import { computed } from 'vue';
import type { AgentAvatar } from '../agents.types';

const props = withDefaults(
	defineProps<{
		avatar: AgentAvatar;
		size?: 'small' | 'medium' | 'large';
	}>(),
	{ size: 'medium' },
);

const dimensions = computed(() => {
	switch (props.size) {
		case 'small':
			return { box: 36, font: 'var(--font-size--lg)' };
		case 'large':
			return { box: 64, font: 'var(--font-size--2xl)' };
		default:
			return { box: 48, font: 'var(--font-size--xl)' };
	}
});
</script>

<template>
	<div
		:class="$style.avatar"
		:style="{
			width: `${dimensions.box}px`,
			height: `${dimensions.box}px`,
		}"
	>
		<!-- Image avatar -->
		<img v-if="avatar.type === 'image'" :src="avatar.value" :class="$style.image" alt="" />

		<!-- Emoji avatar -->
		<span
			v-else-if="avatar.type === 'emoji'"
			:class="$style.emoji"
			:style="{ fontSize: dimensions.font }"
		>
			{{ avatar.value }}
		</span>

		<!-- Initials fallback -->
		<span v-else :class="$style.initials" :style="{ fontSize: dimensions.font }">
			{{ avatar.value }}
		</span>
	</div>
</template>

<style lang="scss" module>
.avatar {
	border-radius: 50%;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	background: var(--color--foreground--tint-2);
}

.image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.emoji {
	line-height: 1;
}

.initials {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	line-height: 1;
}
</style>
