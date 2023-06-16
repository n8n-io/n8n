<template>
	<div :class="$style.section">
		<div v-for="color in colors" :key="color" :class="$style.container">
			<div :class="$style.circle" :style="{ backgroundColor: `var(${color})` }"></div>
			<span>{{ color }}</span>
			<span :class="$style.hsl">{{ hsl[color] }}</span>
			<span :class="$style.color">{{ getHexValue(color) }}</span>
		</div>
	</div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

function hslToHex(h: number, s: number, l: number): string {
	l /= 100;
	const a = (s * Math.min(l, 1 - l)) / 100;
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(255 * color)
			.toString(16)
			.padStart(2, '0'); // convert to Hex and prefix "0" if needed
	};
	return `#${f(0)}${f(8)}${f(4)}`;
}

function getHex(hsl: string): string {
	const colors = hsl
		.replace('hsl(', '')
		.replace(')', '')
		.replace(/%/g, '')
		.split(',')
		.map((n: string) => parseFloat(n));

	return hslToHex(colors[0], colors[1], colors[2]);
}

export default defineComponent({
	name: 'color-circles',
	data() {
		return {
			observer: null as null | MutationObserver,
			hsl: {} as { [color: string]: string },
		};
	},
	props: {
		colors: {
			type: Array as PropType<string[]>,
			required: true,
		},
	},
	created() {
		const setColors = () => {
			this.colors.forEach((color) => {
				const style = getComputedStyle(document.body);

				this.$set(this.hsl, color, style.getPropertyValue(color));
			});
		};

		setColors();

		// when theme class is added or removed, reset color values
		this.observer = new MutationObserver((mutationsList) => {
			for (const mutation of mutationsList) {
				if (mutation.type === 'attributes') {
					setColors();
				}
			}
		});
		const body = document.querySelector('body');
		if (body) {
			this.observer.observe(body, { attributes: true });
		}
	},
	destroyed() {
		if (this.observer) {
			this.observer.disconnect();
		}
	},
	methods: {
		getHexValue(color: string) {
			return getHex(this.hsl[color]);
		},
	},
});
</script>

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
