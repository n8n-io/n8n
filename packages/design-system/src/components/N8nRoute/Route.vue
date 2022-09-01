<template functional>
	<span>
		<router-link
			v-if="$options.methods.useRouterLink(props)"
			:to="props.to"
			@click="(e) => listeners.click && listeners.click(e)"
		>
			<slot></slot>
		</router-link>
		<a
			v-else
			:href="props.to"
			@click="(e) => listeners.click && listeners.click(e)"
			:target="$options.methods.openNewWindow(props) ? '_blank': '_self'"
		>
			<slot></slot>
		</a>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

export default {
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
	methods: {
		useRouterLink(props: {to: object | string, newWindow: boolean | undefined}) {
			if (props.newWindow === true) {
				// router-link does not support click events and opening in new window
				return false;
			}
			if (typeof props.to === 'string') {
				return props.to.startsWith('/');
			}

			return props.to !== undefined;
		},
		openNewWindow(props: {to: string, newWindow: boolean | undefined}) {
			if (props.newWindow !== undefined) {
				return props.newWindow;
			}
			if (typeof props.to === 'string') {
				return !props.to.startsWith('/');
			}
			return true;
		},
	},
};
</script>

