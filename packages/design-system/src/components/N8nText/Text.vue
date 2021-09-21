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
		bold: {
			type: Boolean,
			default: false,
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean => ['large', 'medium', 'small'].includes(value),
		},
	},
	methods: {
		getClass(props: {size: string, bold: boolean}) {
			return `body-${props.size}${props.bold ? '-bold' : ''}`;
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
