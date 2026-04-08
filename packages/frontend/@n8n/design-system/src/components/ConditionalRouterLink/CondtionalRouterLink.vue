<script setup lang="ts">
/**
 * Component that renders either a RouterLink or a normal anchor tag or
 * just the slot content based on whether the `to` or `href` prop is
 * passed or not.
 */
import { useAttrs } from 'vue';
import type { RouterLinkProps } from 'vue-router';
import { RouterLink } from 'vue-router';

defineOptions({
	name: 'ConditionalRouterLink',
	inheritAttrs: false,
});

const props = defineProps({
	// @ts-expect-error TS doesn't understand this but it works
	...RouterLink.props,
	// Make to optional
	to: {
		type: [String, Object] as unknown as () => string | RouterLinkProps['to'] | undefined,
		default: undefined,
	},
	// <a> element "props" are passed as attributes
}) as Partial<RouterLinkProps>;
const attrs = useAttrs();
</script>

<template>
	<div>
		<RouterLink v-if="props.to" v-bind="props" :to="props.to">
			<slot />
		</RouterLink>
		<a v-else-if="attrs.href" v-bind="attrs">
			<slot />
		</a>
		<slot v-else />
	</div>
</template>
