<template>
	<router-link v-if="useRouterLink" :to="to" v-bind="$attrs">
		<slot></slot>
	</router-link>
	<a v-else :href="to" :target="openNewWindow ? '_blank' : '_self'" v-bind="$attrs">
		<slot></slot>
	</a>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'N8nRoute',
	props: {
		to: {
			type: String || Object,
		},
		newWindow: {
			type: Boolean || undefined,
			default: undefined,
		},
	},
	computed: {
		useRouterLink() {
			if (this.newWindow) {
				// router-link does not support click events and opening in new window
				return false;
			}

			if (typeof this.to === 'string') {
				return this.to.startsWith('/');
			}

			return this.to !== undefined;
		},
		openNewWindow() {
			if (this.newWindow !== undefined) {
				return this.newWindow;
			}

			if (typeof this.to === 'string') {
				return !this.to.startsWith('/');
			}
			return true;
		},
	},
});
</script>
