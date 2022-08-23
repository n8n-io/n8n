<template>
	<n8n-route :to="to" :newWindow="newWindow"
		v-on="$listeners"
		class="n8n-link"
	>
		<span
			:class="$style[`${underline ? `${theme}-underline` : theme}`]"
		>
			<n8n-text :size="size" :bold="bold">
				<slot></slot>
			</n8n-text>
		</span>
	</n8n-route>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nText from '../N8nText';
import N8nRoute from '../N8nRoute';

import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-link',
	props: {
		size: {
			type: String,
		},
		to: {
			type: String || Object,
		},
		newWindow: {
			type: Boolean || undefined,
			default: undefined,
		},
		bold: {
			type: Boolean,
			default: false,
		},
		underline: {
			type: Boolean,
			default: false,
		},
		theme: {
			type: String,
			default: 'primary',
			validator: (value: string): boolean =>
				['primary', 'danger', 'text', 'secondary'].includes(value),
		},
	},
	components: {
		N8nText,
		N8nRoute,
	},
});
</script>

<style lang="scss" module>
@import "../../utils";

.primary {
	color: var(--color-primary);

	&:active {
		color: saturation(
				--color-primary-h,
				--color-primary-s,
				--color-primary-l,
				-(30%)
		);
	}
}

.text {
	color: var(--color-text-base);

	&:active {
		color: saturation(--color-primary-h, --color-primary-s, --color-primary-l, -(30%));
	}
}

.danger {
	color: var(--color-danger);

	&:active {
		color: saturation(--color-danger-h, --color-danger-s, --color-danger-l, -(20%));
	}
}

.secondary {
	color: var(--color-secondary);

	&:active {
		color: saturation(--color-secondary-h, --color-secondary-s, --color-secondary-l, -(20%));
	}
}

.secondary {
	background-color: var(--color-secondary-tint-2);
	color: var(--color-secondary);
}

.primary-underline {
	composes: primary;
	text-decoration: underline;
}

.danger-underline {
	composes: danger;
	text-decoration: underline;
}

.secondary-underline {
	composes: secondary;
	text-decoration: underline;
}

</style>
