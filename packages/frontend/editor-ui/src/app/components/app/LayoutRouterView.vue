<script lang="ts" setup>
/**
 * A `RouterView` for a layout. `AppLayout` keeps the old layout on screen until the next one
 * is ready, and the old layout's `RouterView` already renders the next page. That page then
 * shows in the wrong frame, and it jumps when the next layout appears. This view keeps the
 * last route of its own layout until the switch. Nested views follow the same route.
 */
import { shallowRef, watch } from 'vue';
import { useRouter, type RouteLocationNormalizedLoaded } from 'vue-router';

const layoutOf = (route: RouteLocationNormalizedLoaded) => route.meta.layout ?? 'default';

const router = useRouter();
const ownLayout = layoutOf(router.currentRoute.value);
const shownRoute = shallowRef(router.currentRoute.value);

watch(router.currentRoute, (route) => {
	if (layoutOf(route) === ownLayout) shownRoute.value = route;
});
</script>

<template>
	<RouterView :route="shownRoute" />
</template>
