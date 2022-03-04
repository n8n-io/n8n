<template functional>
	<span :class="$style[$options.methods.getClass(props)]" :style="$options.methods.getStyles(props)">
		<slot></slot>
	</span>
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
			validator: (value: string): boolean => ['xsmall', 'mini', 'small', 'medium', 'large', 'xlarge'].includes(value),
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
	},
	methods: {
		getClass(props: {size: string, bold: boolean}) {
			return `body-${props.size}${props.bold ? '-bold' : '-regular'}`;
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

.body-xsmall {
	font-size: var(--font-size-3xs);
	line-height: var(--font-line-height-compact);
}

.body-xsmall-regular {
	composes: regular;
	composes: body-xsmall;
}

.body-xsmall-bold {
	composes: bold;
	composes: body-xsmall;
}

</style>
