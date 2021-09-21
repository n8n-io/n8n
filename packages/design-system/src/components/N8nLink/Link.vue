<template functional>
	<a
		:class="$style.link"
		:href="props.href"
		@click="(e) => listeners.click && listeners.click(e)"
		:target="props.newWindow ? '_blank': '_self'"
	>
		<n8n-text :size="props.size">
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
	},
};
</script>

<style lang="scss" module>
// todo clean up these imports
@function saturation($h, $s, $l, $saturation) {
	@return hsl(var(#{$h}), calc(var(#{$s}) + #{$saturation}), var(#{$l}));
}

.link {
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
</style>
