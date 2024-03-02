<template>
	<router-link v-if="useRouterLink" :to="to" v-bind="$attrs">
		<slot></slot>
	</router-link>
	<a v-else :href="to" :target="openNewWindow ? '_blank' : '_self'" v-bind="$attrs">
		<slot></slot>
	</a>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

// TODO: replace `object` with a more detailed type
export type RouteTo = string | object;

interface RouteProps {
	to?: RouteTo;
	newWindow?: boolean;
}

defineOptions({ name: 'N8nRoute' });
const props = withDefaults(defineProps<RouteProps>(), {});

const useRouterLink = computed(() => {
	if (props.newWindow) {
		// router-link does not support click events and opening in new window
		return false;
	}

	if (typeof props.to === 'string') {
		return props.to.startsWith('/');
	}

	return props.to !== undefined;
});

const openNewWindow = computed(() => {
	if (props.newWindow !== undefined) {
		return props.newWindow;
	}

	if (typeof props.to === 'string') {
		return !props.to.startsWith('/');
	}
	return true;
});
</script>
