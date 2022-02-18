<template>
	<div v-if="!loading" id="app">
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
import Modals from '@/components/Modals.vue';
import Telemetry from './components/Telemetry.vue';

import mixins from 'vue-typed-mixins';
import { showMessage } from './components/mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'App',
	components: {
		Modals,
		Telemetry,
	},
	computed: {
		isTemplatesEnabled() {
			return this.$store.getters['settings/isTemplatesEnabled'];
		},
	},
	data() {
		return {
			loading: true,
		};
	},
	methods: {
		async initialize(): Promise<void> {
			try {
				await this.$store.dispatch('settings/getSettings');
				this.loading = false;
			} catch (e) {
				this.$showToast({
					title: this.$locale.baseText('settings.errors.connectionError.title'),
					message: this.$locale.baseText('settings.errors.connectionError.message'),
					type: 'error',
					duration: 0,
				});

				throw e;
			}
		},
	},
	async mounted() {
		await this.initialize();

		if (this.isTemplatesEnabled && this.$route.path === '/') {
			this.$router.replace({ name: 'TemplatesView'});
		} else if (this.$route.path === '/') {
			this.$router.replace({ name: 'NodeViewNew'});
		}

		this.$store.commit('ui/setCurrentPage', this.$route.name);
		this.$telemetry.page('Editor', this.$route.name);
	},
	watch: {
		'$route'(route) {
			this.$store.commit('ui/setCurrentPage', this.$route.name);
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
