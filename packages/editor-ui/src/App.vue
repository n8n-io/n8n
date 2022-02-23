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
		<Telemetry />
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import Telemetry from './components/Telemetry.vue';
import { HIRING_BANNER } from './constants';

export default Vue.extend({
	name: 'App',
	components: {
		Telemetry,
	},
	computed: {
		...mapGetters({
			isInternalUser: 'settings/isInternalUser',
		}),
	},
	mounted() {
		this.$telemetry.page('Editor', this.$route.name);

		if (!this.isInternalUser) {
			console.log(HIRING_BANNER); // eslint-disable-line no-console
		}
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
