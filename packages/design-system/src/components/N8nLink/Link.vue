<template functional>
	<a
		:class="$style[`${props.underline ? `${props.theme}-underline` : props.theme}`]"
		:href="props.href"
		@click="(e) => listeners.click && listeners.click(e)"
		:target="props.newWindow ? '_blank': '_self'"
	>
		<n8n-text :size="props.size" :bold="props.bold">
			<slot></slot>
		</n8n-text>
	</a>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nText from '../N8nText';

Vue.component('N8nText', N8nText);

export default {
	name: 'n8n-link',
	props: {
		size: {
			type: String,
		},
		href: {
			type: String,
		},
		newWindow: {
			type: Boolean,
			default: false,
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
				['primary', 'danger'].indexOf(value) !== -1,
		},
	},
};
</script>

<style lang="scss" module>
// todo clean up these imports
@function saturation($h, $s, $l, $saturation) {
	@return hsl(var(#{$h}), calc(var(#{$s}) + #{$saturation}), var(#{$l}));
}

.primary {
	color: var(--color-primary);

	&:active {
		color: saturation(
			--color-primary-h,
			--color-primary-s,
			--color-primary-l,
			-(10%)
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
			-(10%)
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
