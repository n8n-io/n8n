<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import type { PropType } from 'vue';
import { getHex, resolveHSLCalc } from './ColorCircles.utils';

const props = defineProps({
	colors: {
		type: Array as PropType<string[]>,
		required: true,
	},
});

const hsl = reactive<{ [color: string]: string }>({});
const observer = ref<MutationObserver | null>(null);

const setColors = () => {
	for (const color of props.colors) {
		const style = getComputedStyle(document.body);
		hsl[color] = style.getPropertyValue(color);
	}
};

onMounted(() => {
	setColors();

	observer.value = new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				setColors();
			}
		}
	});

	const body = document.querySelector('body');
	if (body) {
		observer.value.observe(body, { attributes: true });
	}
});

onUnmounted(() => {
	observer.value?.disconnect();
});

// Expose functions for template usage
const getHexValue = (color: string) => getHex(hsl[color]);
const getHSLValue = (color: string) => resolveHSLCalc(hsl[color]);
</script>

<template>
	<div :class="$style.section">
		<div v-for="color in colors" :key="color" :class="$style.container">
			<div :class="$style.circle" :style="{ backgroundColor: `var(${color})` }"></div>
			<span>{{ color }}</span>
			<span :class="$style.hsl">{{ getHSLValue(color) }}</span>
			<span :class="$style.color">{{ getHexValue(color) }}</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
}

.name {
	align-self: center;
}

.container {
	width: 140px;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	align-self: flex-start;
	padding: 5px;
	color: var(--color-text-dark);
}

.circle {
	border-radius: 50%;
	height: 80px;
	width: 80px;
	margin-bottom: 5px;
	border: 1px solid lightgray;
}

.color {
	font-size: 0.8em;
}

.hsl {
	composes: color;
	content: var(--color-primary);
}
</style>
