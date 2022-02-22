<template>
	<div>
		<LoadingView v-if="loading" />
		<div v-else id="app">
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
	</div>
</template>

<script lang="ts">
import Modals from '@/components/Modals.vue';
import Telemetry from './components/Telemetry.vue';
import LoadingView from './views/LoadingView.vue';

import mixins from 'vue-typed-mixins';
import { showMessage } from './components/mixins/showMessage';
import { mapGetters } from 'vuex';

export default mixins(showMessage).extend({
	name: 'App',
	components: {
		LoadingView,
		Modals,
		Telemetry,
	},
	computed: {
		...mapGetters('settings', ['isTemplatesEnabled', 'isTemplatesEndpointReachable']),
	},
	data() {
		return {
			loading: true,
		};
	},
	methods: {
		async initSettings(): Promise<void> {
			try {
				await this.$store.dispatch('settings/getSettings');
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
		async initTemplates(): Promise<void> {
			try {
				await this.$store.dispatch('settings/testTemplatesEndpoint');
			} catch (e) {
			}
		},
		async initialize(): Promise<void> {
			await this.initSettings();
			await this.initTemplates();
			this.loading = false;
		},
		trackPage() {
			this.$store.commit('ui/setCurrentPage', this.$route.name);
			this.$telemetry.page('Editor', this.$route);

			if (this.$route && this.$route.meta && this.$route.meta.templatesEnabled) {
				this.$store.commit('templates/setSessionId');
			}
			else {
				this.$store.commit('templates/resetSessionId'); // reset telemetry session id when user leaves template pages
			}
		},
	},
	async mounted() {
		await this.initialize();

		if (this.isTemplatesEnabled && this.isTemplatesEndpointReachable && this.$route.path === '/') {
			this.$router.replace({ name: 'TemplatesSearchView'});
		} else if (this.$route.path === '/') {
			this.$router.replace({ name: 'NodeViewNew'});
		}

		if (!this.isTemplatesEnabled && this.$route.meta && this.$route.meta.templatesEnabled) {
			this.$router.replace({ name: 'NodeViewNew'});
		}

		this.trackPage();
	},
	watch: {
		'$route'() {
			this.trackPage();
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
	background-color: var(--color-background-light);
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
