<script setup lang="ts">
/**
 * Component that renders either a RouterLink or a normal anchor tag or
 * just the slot content based on whether the `to` or `href` prop is
 * passed or not.
 */
import type { PropType } from 'vue';
import { useAttrs } from 'vue';
import type { RouterLinkProps } from 'vue-router';
import { RouterLink } from 'vue-router';

defineOptions({
	name: 'ConditionalRouterLink',
	inheritAttrs: false,
});

/**
 * Declared explicitly rather than spread from `RouterLink.props`, which is
 * typed as `any` and so collapsed this component's whole props type to `{}` in
 * the emitted declarations. Mirrors RouterLink's runtime prop declarations
 * exactly, except that `to` is optional here — without it the component falls
 * back to an `<a>` or to the bare slot.
 *
 * Deliberately absent: `viewTransition`. It is in the `RouterLinkProps` *type*
 * but is not one of RouterLink's declared props — it is a `useLink()` option, and
 * `RouterLinkImpl.setup` passes only the declared props to `useLink`, so it is
 * unreachable through `<RouterLink>` itself (vue-router 4.5.0). Declaring it here
 * would add a prop RouterLink does not have and bind it as a stray DOM attribute.
 * `ConditionalRouterLink.test.ts` pins both lists so this cannot drift silently.
 */
const props = defineProps({
	to: {
		type: [String, Object] as PropType<RouterLinkProps['to'] | undefined>,
		default: undefined,
	},
	replace: Boolean,
	activeClass: String,
	exactActiveClass: String,
	custom: Boolean,
	ariaCurrentValue: {
		type: String as PropType<RouterLinkProps['ariaCurrentValue']>,
		default: 'page',
	},
	// <a> element "props" are passed as attributes
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
