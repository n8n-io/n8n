<template>
	<router-link v-if="useRouterLink && to" :to="to" v-bind="$attrs">
		<slot></slot>
	</router-link>
	<a
		v-else
		:href="to ? `${to}` : undefined"
		:target="openNewWindow ? '_blank' : '_self'"
		v-bind="$attrs"
	>
		<slot></slot>
	</a>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { type RouteLocationRaw } from 'vue-router';

interface RouteProps {
	to?: RouteLocationRaw | string;
	newWindow?: boolean;
}

defineOptions({ name: 'N8nRoute' });
const props = defineProps<RouteProps>();

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

const openNewWindow = computed(() => !useRouterLink.value);
</script>
