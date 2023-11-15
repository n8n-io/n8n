<template>
	<n8n-route :to="to" :newWindow="newWindow" v-bind="$attrs" class="n8n-link">
		<span :class="$style[`${underline ? `${theme}-underline` : theme}`]">
			<n8n-text :size="size" :bold="bold">
				<slot></slot>
			</n8n-text>
		</span>
	</n8n-route>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import N8nText from '../N8nText';
import N8nRoute from '../N8nRoute';

export default defineComponent({
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
@import '../../utils';
@import '../../css/common/var';

.primary {
	color: $link-color;

	&:active {
		color: $link-color-active;
	}
}

.text {
	color: var(--color-text-base);

	&:hover {
		color: $link-color;
	}

	&:active {
		color: $link-color-active;
	}
}

.danger {
	color: var(--color-danger);

	&:active {
		color: var(--color-danger-shade-1);
	}
}

.secondary {
	color: var(--color-secondary-link);

	&:active {
		color: var(--color-secondary-link-hover);
	}
}

.primary-underline {
	composes: primary;
	text-decoration: underline;
}

.text-underline {
	composes: text;
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
