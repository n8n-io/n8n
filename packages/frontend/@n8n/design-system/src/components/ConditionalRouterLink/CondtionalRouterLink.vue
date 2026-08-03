<script setup lang="ts">
/**
 * Component that renders either a RouterLink or a normal anchor tag or
 * just the slot content based on whether the `to` or `href` prop is
 * passed or not.
 */
import { useAttrs } from 'vue';
import type {
	RouteLocationAsPathGeneric,
	RouteLocationAsRelativeGeneric,
	RouterLinkProps,
} from 'vue-router';
import { RouterLink } from 'vue-router';

defineOptions({
	name: 'ConditionalRouterLink',
	inheritAttrs: false,
});

/**
 * Declared here rather than spread from `RouterLink.props`, which is typed as
 * `any` and so collapsed this component's whole props type to `{}` in the
 * emitted declarations. Mirrors RouterLink's runtime prop declarations exactly,
 * except that `to` is optional — without it the component falls back to an
 * `<a>` or to the bare slot.
 */
type Props = {
	/**
	 * `RouteLocationRaw` expanded by hand. It is a conditional type, which Vue's
	 * compile-time resolver cannot evaluate — leaving `to` with no runtime prop
	 * type at all. This union is what it resolves to without typed routes, and
	 * regenerates the original `[String, Object]`.
	 */
	to?: string | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric;
	replace?: boolean;
	activeClass?: string;
	exactActiveClass?: string;
	custom?: boolean;
	ariaCurrentValue?: RouterLinkProps['ariaCurrentValue'];
	// <a> element "props" are passed as attributes
};

const props = withDefaults(defineProps<Props>(), {
	to: undefined,
	ariaCurrentValue: 'page',
});
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
