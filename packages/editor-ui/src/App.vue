<template>
	<div :class="$style.container">
		<LoadingView v-if="loading" />
		<div v-else id="app" :class="$style.container">
			<div id="header" :class="$style.header">
				<router-view name="header"></router-view>
			</div>
			<div id="sidebar" :class="$style.sidebar">
				<router-view name="sidebar"></router-view>
			</div>
			<div id="content" :class="$style.content">
				<router-view />
			</div>
			<Modals />
			<Telemetry />
		</div>
	</div>
</template>

<script lang="ts">
import Modals from './components/Modals.vue';
import LoadingView from './views/LoadingView.vue';
import Telemetry from './components/Telemetry.vue';
import { HIRING_BANNER } from './constants';

import mixins from 'vue-typed-mixins';
import { showMessage } from './components/mixins/showMessage';
import { IUser } from './Interface';
import { mapGetters } from 'vuex';

export default mixins(showMessage).extend({
	name: 'App',
	components: {
		LoadingView,
		Telemetry,
		Modals,
	},
	computed: {
		...mapGetters('settings', ['isInternalUser', 'isTemplatesEnabled', 'isTemplatesEndpointReachable', 'isUserManagementEnabled', 'showSetupPage']),
		...mapGetters('users', ['canCurrentUserAccessView', 'currentUser']),
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
		async loginWithCookie(): Promise<void> {
			try {
				await this.$store.dispatch('users/loginWithCookie');
			} catch (e) {}
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
			await this.loginWithCookie();
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
		authenticate() {
			// redirect to setup page. user should be redirected to this only once
			if (this.isUserManagementEnabled && this.showSetupPage) {
				this.loading = false;
				if (this.$route.name === 'SetupView') {
					return;
				}

				this.$router.replace({ name: 'SetupView' });
				return;
			}

			if (this.$route.name === 'SetupView' && !this.isUserManagementEnabled) {
				this.$router.replace('/');

				this.loading = false;
				return;
			}

			if (this.canCurrentUserAccessView(this.$router.currentRoute.name)) {
				this.loading = false;

				return;
			}

			const user = this.currentUser as IUser | null;
			if (!user) {
				const redirect =
					this.$route.query.redirect ||
					encodeURIComponent(`${window.location.pathname}${window.location.search}`);
				this.$router.replace({ name: 'SigninView', query: { redirect } });
			} else {
				if (typeof this.$route.query.redirect === 'string') {
					const redirect = decodeURIComponent(this.$route.query.redirect);
					if (redirect.startsWith('/')) {
						// protect against phishing
						this.$router.replace(redirect);
					}
				} else {
					this.$router.replace({ name: 'NodeViewNew' });
				}
			}

			this.loading = false;
		},
	},
	async mounted() {
		await this.initialize();
		this.authenticate();

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
		$route(route) {
			this.authenticate();
			this.trackPage();
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
}

.content {
	composes: container;
	background-color: var(--color-background-light);
	position: relative;
}

.header {
	z-index: 10;
	position: fixed;
	width: 100%;
}

.sidebar {
	z-index: 15;
	position: fixed;
}
</style>
