<template functional>
	<component :is="props.tag" :class="$style[$options.methods.getClass(props)]" :style="$options.methods.getStyles(props)">
		<slot></slot>
	</component>
</template>

<script lang="ts">
export default {
	name: 'n8n-heading',
	props: {
		tag: {
			type: String,
			default: 'span',
		},
		bold: {
			type: Boolean,
			default: false,
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean => ['2xlarge', 'xlarge', 'large', 'medium', 'small'].includes(value),
		},
		color: {
			type: String,
			validator: (value: string): boolean => ['primary', 'text-dark', 'text-base', 'text-light', 'text-xlight'].includes(value),
		},
	},
	methods: {
		getClass(props: {size: string, bold: boolean}) {
			return `heading-${props.size}${props.bold ? '-bold' : '-regular'}`;
		},
		getStyles(props: {color: string}) {
			const styles = {} as any;
			if (props.color) {
				styles.color = `var(--color-${props.color})`;
			}
			return styles;
		},
	},
};
</script>

<style lang="scss" module>
.bold {
	font-weight: var(--font-weight-bold);
}

.regular {
	font-weight: var(--font-weight-regular);
}

.heading-2xlarge {
	font-size: var(--font-size-2xl);
	line-height: var(--font-line-height-compact);
}

.heading-2xlarge-regular {
	composes: regular;
	composes: heading-2xlarge;
}

.heading-2xlarge-bold {
	composes: bold;
	composes: heading-2xlarge;
}

.heading-xlarge {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-compact);
}

.heading-xlarge-regular {
	composes: regular;
	composes: heading-xlarge;
}

.heading-xlarge-bold {
	composes: bold;
	composes: heading-xlarge;
}

.heading-large {
	font-size: var(--font-size-l);
	line-height: var(--font-line-height-loose);
}

.heading-large-regular {
	composes: regular;
	composes: heading-large;
}

.heading-large-bold {
	composes: bold;
	composes: heading-large;
}

.heading-medium {
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-loose);
}

.heading-medium-regular {
	composes: regular;
	composes: heading-medium;
}

.heading-medium-bold {
	composes: bold;
	composes: heading-medium;
}

.heading-small {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-regular);
}

.heading-small-regular {
	composes: regular;
	composes: heading-small;
}

.heading-small-bold {
	composes: bold;
	composes: heading-small;
}

</style>
