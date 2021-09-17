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
			validator: (value: string): boolean => ['xlarge', 'large', 'medium', 'small'].includes(value),
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

.heading-xlarge {
	font-size: var(--font-size-2xl);
	line-height: var(--font-line-height-compact);
}

.heading-xlarge-bold {
	composes: bold;
	composes: heading-xlarge;
}

.heading-large {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-loose);
}

.heading-large-bold {
	composes: bold;
	composes: heading-large;
}

.heading-medium {
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-loose);
}

.heading-medium-bold {
	composes: bold;
	composes: heading-medium;
}

.heading-small {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-regular);
}

.heading-small-bold {
	composes: bold;
	composes: heading-small;
}

.body-xlarge {
	font-size: var(--font-size-lg);
	line-height: var(--font-line-height-xloose);
}

.body-xlarge-bold {
	composes: bold;
	composes: body-xlarge;
}

.body-large {
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
}

.body-large-bold {
	composes: bold;
	composes: body-large;
}

.body-medium {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
}

.body-medium-bold {
	composes: bold;
	composes: body-medium;
}

.body-small {
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-loose);
}

.body-small-bold {
	composes: bold;
	composes: body-small;
}

</style>
