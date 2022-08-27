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
import { HIRING_BANNER, VIEWS } from './constants';

import mixins from 'vue-typed-mixins';
import { showMessage } from './components/mixins/showMessage';
import { IUser } from './Interface';
import { mapGetters } from 'vuex';
import { userHelpers } from './components/mixins/userHelpers';
import { addHeaders, loadLanguage } from './plugins/i18n';
import { restApi } from '@/components/mixins/restApi';

export default mixins(
	showMessage,
	userHelpers,
	restApi,
).extend({
	name: 'App',
	components: {
		LoadingView,
		Telemetry,
		Modals,
	},
	computed: {
		...mapGetters('settings', ['isHiringBannerEnabled', 'isTemplatesEnabled', 'isTemplatesEndpointReachable', 'isUserManagementEnabled', 'showSetupPage']),
		...mapGetters('users', ['currentUser']),
		defaultLocale (): string {
			return this.$store.getters.defaultLocale;
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
					title: this.$locale.baseText('startupError'),
					message: this.$locale.baseText('startupError.message'),
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
			if (!this.isTemplatesEnabled) {
				return;
			}

			try {
				await this.$store.dispatch('settings/testTemplatesEndpoint');
			} catch (e) {
			}
		},
		logHiringBanner() {
			if (this.isHiringBannerEnabled && this.$route.name !== VIEWS.DEMO) {
				console.log(HIRING_BANNER); // eslint-disable-line no-console
			}
		},
		async initialize(): Promise<void> {
			await this.initSettings();
			await Promise.all([this.loginWithCookie(), this.initTemplates()]);
		},
		trackPage() {
			this.$store.commit('ui/setCurrentView', this.$route.name);
			if (this.$route && this.$route.meta && this.$route.meta.templatesEnabled) {
				this.$store.commit('templates/setSessionId');
			}
			else {
				this.$store.commit('templates/resetSessionId'); // reset telemetry session id when user leaves template pages
			}

			this.$telemetry.page(this.$route);
		},
		authenticate() {
			// redirect to setup page. user should be redirected to this only once
			if (this.isUserManagementEnabled && this.showSetupPage) {
				if (this.$route.name === VIEWS.SETUP) {
					return;
				}

				this.$router.replace({ name: VIEWS.SETUP });
				return;
			}

			if (this.canUserAccessCurrentRoute()) {
				return;
			}

			// if cannot access page and not logged in, ask to sign in
			const user = this.currentUser as IUser | null;
			if (!user) {
				const redirect =
					this.$route.query.redirect ||
					encodeURIComponent(`${window.location.pathname}${window.location.search}`);
				this.$router.replace({ name: VIEWS.SIGNIN, query: { redirect } });
				return;
			}

			// if cannot access page and is logged in, respect signin redirect
			if (this.$route.name === VIEWS.SIGNIN && typeof this.$route.query.redirect === 'string') {
				const redirect = decodeURIComponent(this.$route.query.redirect);
				if (redirect.startsWith('/')) { // protect against phishing
					this.$router.replace(redirect);
					return;
				}
			}

			// if cannot access page and is logged in
			this.$router.replace({ name: VIEWS.HOMEPAGE });
		},
		redirectIfNecessary() {
			const redirect = this.$route.meta && typeof this.$route.meta.getRedirect === 'function' && this.$route.meta.getRedirect(this.$store);
			if (redirect) {
				this.$router.replace(redirect);
			}
		},
	},
	async mounted() {
		await this.initialize();
		this.logHiringBanner();
		this.authenticate();
		this.redirectIfNecessary();

		this.loading = false;

		this.trackPage();
		this.$externalHooks().run('app.mount');

		if (this.defaultLocale !== 'en') {
			void this.$store.dispatch('nodeTypes/getNodeTranslationHeaders');
		}
	},
	watch: {
		$route(route) {
			this.authenticate();
			this.redirectIfNecessary();

			this.trackPage();
		},
		defaultLocale(newLocale) {
			loadLanguage(newLocale);
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

