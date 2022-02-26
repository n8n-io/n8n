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
import { mapGetters } from 'vuex';
import Telemetry from './components/Telemetry.vue';
import { HIRING_BANNER } from './constants';
import Modals from '@/components/Modals.vue';
import LoadingView from './views/LoadingView.vue';
import mixins from 'vue-typed-mixins';
import { showMessage } from './components/mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'App',
	components: {
		LoadingView,
		Modals,
		Telemetry,
	},
	computed: {
		...mapGetters('settings', ['isInternalUser', 'isTemplatesEnabled', 'isTemplatesEndpointReachable']),
		isRootPath(): boolean {
			return this.$route.path === '/';
		},
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
				const templatesPromise = this.$store.dispatch('settings/testTemplatesEndpoint');
				if (this.isRootPath) { // only delay loading to determine redirect
					await templatesPromise;
				}
			} catch (e) {
			}
		},
		async initialize(): Promise<void> {
			await this.initSettings();
			await this.initTemplates();

			if (!this.isInternalUser && this.$route.name !== 'WorkflowDemo') {
				console.log(HIRING_BANNER); // eslint-disable-line no-console
			}
		},
		trackPage() {
			this.$store.commit('ui/setCurrentView', this.$route.name);
			if (this.$route && this.$route.meta && this.$route.meta.templatesEnabled) {
				this.$store.commit('templates/setSessionId');
			}
			else {
				this.$store.commit('templates/resetSessionId'); // reset telemetry session id when user leaves template pages
			}

			this.$telemetry.page('Editor', this.$route);
		},
	},
	async mounted() {
		await this.initialize();

		if (this.isTemplatesEnabled && this.isTemplatesEndpointReachable && this.isRootPath) {
			this.$router.replace({ name: 'TemplatesSearchView'});
		} else if (this.isRootPath) {
			this.$router.replace({ name: 'NodeViewNew'});
		}
		else if (!this.isTemplatesEnabled && this.$route.meta && this.$route.meta.templatesEnabled) {
			this.$router.replace({ name: 'NodeViewNew'});
		}
		this.loading = false;

		this.trackPage();
		this.$externalHooks().run('app.mount');
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
