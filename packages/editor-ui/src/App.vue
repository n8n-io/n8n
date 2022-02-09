<template>
	<div id="app">
		<div id="header">
			<router-view name="header"></router-view>
		</div>
		<div id="sidebar">
			<router-view name="sidebar"></router-view>
		</div>
		<div id="content">
			<router-view />
		</div>
		<Modals />
		<Telemetry />
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import Modals from '@/components/Modals.vue';
import Telemetry from './components/Telemetry.vue';

export default Vue.extend({
	name: 'App',
	components: {
		Modals,
		Telemetry,
	},
	mounted() {
		this.$telemetry.page('Editor', this.$route.name);
	},
	watch: {
		'$route'(route) {
			this.$telemetry.page('Editor', route.name);
		},
	},
});
</script>

<style lang="scss">

#app {
	padding: 0;
	margin: 0 auto;
}

#content {
	position: relative;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: var(--color-background-light);
}

#header {
	z-index: 10;
	position: fixed;
	width: 100%;
}

#sidebar {
	z-index: 15;
	position: fixed;
}

</style>
