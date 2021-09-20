<template>
	<div :class="$style.rootContainer">
		<LoadingView v-if="loading" />
		<div id="app" :class="$style.container" v-else>
			<div id="header" :class="$style.header">
				<router-view name="header"></router-view>
			</div>
			<div id="sidebar" :class="$style.sidebar">
				<router-view name="sidebar"></router-view>
			</div>
			<div id="content" :class="$style.container">
				<router-view />
			</div>
		</div>
		<Telemetry />
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import LoadingView from './views/LoadingView.vue';
import Telemetry from './components/Telemetry.vue';

export default Vue.extend({
	name: 'App',
	components: {
		LoadingView,
		Telemetry,
	},
	data() {
		return {
			loading: true,
		};
	},
	async mounted() {
		await this.$store.dispatch('settings/fetchSettings');
		// await this.$store.dispatch('users/getCurrentUser');
		this.loading = false;
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
}

.rootContainer {
	composes: container;
	background-color: var(--color-background-light);
}

.header {
	z-index: 10;
	position: fixed;
	width: 100;
}

.sidebar {
	z-index: 15;
	position: fixed;
}
</style>

