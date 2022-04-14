<template functional>
	<component :is="props.tag" :class="$options.methods.getClasses(props, $style)" :style="$options.methods.getStyles(props)">
		<slot></slot>
	</component>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
	name: 'n8n-text',
	props: {
		bold: {
			type: Boolean,
			default: false,
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean => ['xsmall', 'small', 'medium', 'large', 'xlarge'].includes(value),
		},
		color: {
			type: String,
			validator: (value: string): boolean => ['primary', 'text-dark', 'text-base', 'text-light', 'text-xlight'].includes(value),
		},
		align: {
			type: String,
			validator: (value: string): boolean => ['right', 'left', 'center'].includes(value),
		},
		compact: {
			type: Boolean,
			default: false,
		},
		tag: {
			type: String,
			default: 'span',
		},
	},
	methods: {
		getClasses(props: {size: string, bold: boolean}, $style: any) {
			return {[$style[`size-${props.size}`]]: true, [$style.bold]: props.bold, [$style.regular]: !props.bold};
		},
		getStyles(props: {color: string, align: string, compact: false}) {
			const styles = {} as any;
			if (props.color) {
				styles.color = `var(--color-${props.color})`;
			}
			if (props.compact) {
				styles['line-height'] = 1;
			}
			if (props.align) {
				styles['text-align'] = props.align;
			}
			return styles;
		},
	},
});
</script>

<style lang="scss" module>
.bold {
	font-weight: var(--font-weight-bold);
}

.regular {
	font-weight: var(--font-weight-regular);
}

.size-xlarge {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-xloose);
}

.size-large {
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
}

.size-medium {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
}

.size-small {
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-loose);
}

.size-xsmall {
	font-size: var(--font-size-3xs);
	line-height: var(--font-line-height-compact);
}

</style>
