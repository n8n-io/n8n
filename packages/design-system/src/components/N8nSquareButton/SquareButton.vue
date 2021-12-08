<template functional>
	<button :class="$style.button" @click="(e) => listeners.click && listeners.click(e)">
		<span :class="$style[$options.methods.getClass(props)]" :style="$options.methods.getStyles(props)" v-text="props.label" />
	</button>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
	name: 'n8n-square-button',
	props: {
		bold: {
			type: Boolean,
			default: false,
		},
		color: {
			type: String,
			default: 'background-dark',
			validator: (value: string): boolean => ['primary', 'background-dark', 'text-dark', 'text-base', 'text-light', 'text-xlight'].includes(value),
		},
		label: {
			type: String,
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean =>
				['mini', 'small', 'medium', 'large', 'xlarge'].indexOf(value) !== -1,
		},
	},
	methods: {
		getClass(props: {size: string, bold: boolean}) {
			return `body-${props.size}${props.bold ? '-bold' : '-regular'}`;
		},
		getStyles(props: {color: string}) {
			const styles = {} as any;
			if (props.color) {
				styles.color = `var(--color-${props.color})`;
			}
			return styles;
		},
	}
});
</script>

<style lang="scss" module>
.button {
	width: 28px;
	height: 29px;
	border-radius: 4px;
	border: var(--color-background-xlight);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		.body-medium-bold {
			color: var(--color-primary)!important;
		}
	}
}

.bold {
	font-weight: var(--font-weight-bold);
}

.regular {
	font-weight: var(--font-weight-regular);
}

.body-xlarge {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-xloose);
}

.body-xlarge-regular {
	composes: regular;
	composes: body-xlarge;
}

.body-xlarge-bold {
	composes: bold;
	composes: body-xlarge;
}

.body-large {
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
}

.body-large-regular {
	composes: regular;
	composes: body-large;
}

.body-large-bold {
	composes: bold;
	composes: body-large;
}

.body-medium {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
}

.body-medium-regular {
	composes: regular;
	composes: body-medium;
}

.body-medium-bold {
	composes: bold;
	composes: body-medium;
}

.body-small {
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-loose);
}

.body-small-regular {
	composes: regular;
	composes: body-small;
}

.body-small-bold {
	composes: bold;
	composes: body-small;
}
</style>
