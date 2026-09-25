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
 * Declared here rather than spread from `RouterLink.props`, which does not exist
 * on RouterLink's type at all (`_RouterLinkI` declares only `new()` and
 * `useLink`) — the spread needed a `@ts-expect-error`, and the recovered `any`
 * collapsed this component's whole props type to `{}` in the emitted
 * declarations. Mirrors RouterLink's runtime prop declarations exactly, except
 * that `to` is optional here — without it the component falls back to an `<a>`
 * or to the bare slot.
 *
 * Deliberately absent: `viewTransition`. It is in the `RouterLinkProps` *type*
 * but is not one of RouterLink's declared props — it is a `useLink()` option, and
 * `RouterLinkImpl.setup` passes only the declared props to `useLink`, so it is
 * unreachable through `<RouterLink>` itself (vue-router 4.5.0). Declaring it here
 * adds a prop RouterLink does not have, which Vue then binds as a stray
 * `viewtransition="false"` DOM attribute on every rendered link — measured, not
 * predicted. `ConditionalRouterLink.test.ts` compares this list against
 * `RouterLink.props` at run time, so a vue-router that promotes `viewTransition`
 * to a real prop fails that test and tells us to add it then.
 */
type Props = {
	/**
	 * `RouteLocationRaw` expanded by hand. It is a conditional type, which Vue's
	 * compile-time resolver cannot evaluate — leaving `to` with no runtime prop
	 * type at all, silently dropping the `[String, Object]` the test pins. This
	 * union is what it resolves to without typed routes (no `RouteMap`
	 * augmentation exists in this repo).
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
