<template functional>
	<component :is="props.tag" :class="$options.methods.getClasses(props, $style)" :style="$options.methods.getStyles(props)">
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
		align: {
			type: String,
			validator: (value: string): boolean => ['right', 'left', 'center'].includes(value),
		},
	},
	methods: {
		getClasses(props: {size: string, bold: boolean}, $style: any) {
			return {[$style[`size-${props.size}`]]: true, [$style.bold]: props.bold, [$style.regular]: !props.bold};
		},
		getStyles(props: {color: string}) {
			const styles = {} as any;
			if (props.color) {
				styles.color = `var(--color-${props.color})`;
			}
			if (props.align) {
				styles['text-align'] = props.align;
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

.size-2xlarge {
	font-size: var(--font-size-2xl);
	line-height: var(--font-line-height-compact);
}

.size-xlarge {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-compact);
}

.size-large {
	font-size: var(--font-size-l);
	line-height: var(--font-line-height-loose);
}

.size-medium {
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-loose);
}

.size-small {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-regular);
}

</style>
