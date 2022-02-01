<template functional>
	<fragment>
		<router-link
			v-if="typeof props.to === 'Object' || (typeof props.to === 'string' && !props.newWindow && props.to.startsWith('/'))"
			:to="props.to"
			@click="(e) => listeners.click && listeners.click(e)"
		>
			<slot></slot>
		</router-link>
		<a
			v-else
			:href="props.to"
			@click="(e) => listeners.click && listeners.click(e)"
			:target="props.newWindow ? '_blank': '_self'"
		>
			<slot></slot>
		</a>
	</fragment>
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
			type: Boolean,
			default: false,
		},
	},
};
</script>

