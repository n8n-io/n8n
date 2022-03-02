<template functional>
	<component :is="$options.components.N8nRoute" :to="props.to" :newWindow="props.newWindow"
		@click="listeners.click"
	>
		<span
			:class="$style[`${props.underline ? `${props.theme}-underline` : props.theme}`]"
		>
			<component :is="$options.components.N8nText" :size="props.size" :bold="props.bold">
				<slot></slot>
			</component>
		</span>
	</component>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nText from '../N8nText';
import N8nRoute from '../N8nRoute';

export default {
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
				['primary', 'danger', 'text'].includes(value),
		},
	},
	components: {
		N8nText,
		N8nRoute,
	},
};
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
		color: saturation(
			--color-primary-h,
			--color-primary-s,
			--color-primary-l,
			-(30%)
		);
	}
}

.danger {
	color: var(--color-danger);

	&:active {
		color: saturation(
			--color-danger-h,
			--color-danger-s,
			--color-danger-l,
			-(20%)
		);
	}
}

.primary-underline {
	composes: primary;
	text-decoration: underline;
}

.danger-underline {
	composes: danger;
	text-decoration: underline;
}


</style>
