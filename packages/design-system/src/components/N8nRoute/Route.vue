<template>
	<span>
		<router-link
			v-if="useRouterLink"
			:to="to"
			v-on="$listeners"
		>
			<slot></slot>
		</router-link>
		<a
			v-else
			:href="to"
			:target="openNewWindow ? '_blank': '_self'"
			v-on="$listeners"
		>
			<slot></slot>
		</a>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-route',
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
			if (this.newWindow === true) {
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

