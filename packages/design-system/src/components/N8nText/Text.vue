<template functional>
	<span :class="$style[$options.methods.getClass(props)]">
		<slot></slot>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
	name: 'n8n-text',
	props: {
		type: {
			type: String,
			default: 'body',
			validator: (value: string): boolean => ['body', 'heading'].includes(value),
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
	},
	methods: {
		getClass(props: {type: string, size: string, bold: boolean}) {
			return `${props.type}-${props.size}${props.bold ? '-bold' : ''}`;
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

.heading-2xlarge {
	composes: regular;
	font-size: var(--font-size-2xl);
	line-height: var(--font-line-height-compact);
}

.heading-xlarge-bold {
	composes: bold;
	composes: heading-2xlarge;
}

.heading-xlarge {
	composes: regular;
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-compact);
}

.heading-xlarge-bold {
	composes: bold;
	composes: heading-xlarge;
}

.heading-large {
	composes: regular;
	font-size: var(--font-size-l);
	line-height: var(--font-line-height-loose);
}

.heading-large-bold {
	composes: bold;
	composes: heading-large;
}

.heading-medium {
	composes: regular;
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-loose);
}

.heading-medium-bold {
	composes: bold;
	composes: heading-medium;
}

.heading-small {
	composes: regular;
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-regular);
}

.heading-small-bold {
	composes: bold;
	composes: heading-small;
}

.body-xlarge {
	composes: regular;
	font-size: var(--font-size-lg);
	line-height: var(--font-line-height-xloose);
}

.body-xlarge-bold {
	composes: bold;
	composes: body-xlarge;
}

.body-large {
	composes: regular;
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
}

.body-large-bold {
	composes: bold;
	composes: body-large;
}

.body-medium {
	composes: regular;
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
}

.body-medium-bold {
	composes: bold;
	composes: body-medium;
}

.body-small {
	composes: regular;
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-loose);
}

.body-small-bold {
	composes: bold;
	composes: body-small;
}

</style>
