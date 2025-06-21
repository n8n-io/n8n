<script lang="ts" setup>
import { customIcons } from './custom-icons';

interface CustomSVGProps {
	iconName: keyof typeof customIcons;
}

const props = defineProps<CustomSVGProps>();
</script>

<template>
	<svg
		aria-hidden="true"
		focusable="false"
		role="img"
		:viewBox="`0 0 ${customIcons[iconName].width} ${customIcons[iconName].height}`"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			v-if="typeof customIcons[iconName].paths === 'string'"
			fill="currentColor"
			:d="customIcons[iconName].paths"
		/>
		<path
			v-for="(path, i) in customIcons[iconName].paths"
			v-else
			:key="`${i}`"
			stroke="currentColor"
			:d="path"
		/>
	</svg>
</template>
