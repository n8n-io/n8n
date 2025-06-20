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
		:viewBox="`0 0 ${customIcons[iconName].icon[0]} ${customIcons[iconName].icon[1]}`"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			v-if="typeof customIcons[iconName].icon[4] === 'string'"
			fill="currentColor"
			:d="customIcons[iconName].icon[4]"
		/>
		<path
			v-for="(path, i) in customIcons[iconName].icon[4]"
			v-else
			:key="`${i}`"
			fill="currentColor"
			:d="path"
		/>
	</svg>
</template>
