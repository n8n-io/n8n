<template>
	<div :class="[$style.app, 'root-container']">
		<LoadingView v-if="loading" />
		<div
			v-else
			id="app"
			:class="{
				[$style.container]: true,
				[$style.sidebarCollapsed]: uiStore.sidebarMenuCollapsed,
			}"
		>
			<div id="header" :class="$style.header">
				<router-view name="header"></router-view>
			</div>
			<div id="sidebar" :class="$style.sidebar">
				<router-view name="sidebar"></router-view>
			</div>
			<div id="content" :class="$style.content">
				<keep-alive include="NodeView" :max="1">
					<router-view />
				</keep-alive>
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
import { HIRING_BANNER, LOCAL_STORAGE_THEME, POSTHOG_ASSUMPTION_TEST, VIEWS } from './constants';

import mixins from 'vue-typed-mixins';
import { showMessage } from '@/mixins/showMessage';
import { userHelpers } from '@/mixins/userHelpers';
import { loadLanguage } from './plugins/i18n';
import useGlobalLinkActions from '@/composables/useGlobalLinkActions';
import { restApi } from '@/mixins/restApi';
import { mapStores } from 'pinia';
import { useUIStore } from './stores/ui';
import { useSettingsStore } from './stores/settings';
import { useUsersStore } from './stores/users';
import { useRootStore } from './stores/n8nRootStore';
import { useTemplatesStore } from './stores/templates';
import { useNodeTypesStore } from './stores/nodeTypes';
import { historyHelper } from '@/mixins/history';

export default mixins(showMessage, userHelpers, restApi, historyHelper).extend({
	name: 'App',
	components: {
		LoadingView,
		Telemetry,
		Modals,
	},
	setup() {
		const { registerCustomAction, unregisterCustomAction } = useGlobalLinkActions();
		return {
			registerCustomAction,
			unregisterCustomAction,
		};
	},
	computed: {
		...mapStores(
			useNodeTypesStore,
			useRootStore,
			useSettingsStore,
			useTemplatesStore,
			useUIStore,
			useUsersStore,
		),
		defaultLocale(): string {
			return this.rootStore.defaultLocale;
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
				await this.settingsStore.getSettings();
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
				await this.usersStore.loginWithCookie();
			} catch (e) {}
		},
		async initTemplates(): Promise<void> {
			if (!this.settingsStore.isTemplatesEnabled) {
				return;
			}
			try {
				await this.settingsStore.testTemplatesEndpoint();
			} catch (e) {}
		},
		logHiringBanner() {
			if (this.settingsStore.isHiringBannerEnabled && this.$route.name !== VIEWS.DEMO) {
				console.log(HIRING_BANNER); // eslint-disable-line no-console
			}
		},
		async initialize(): Promise<void> {
			await this.initSettings();
			await Promise.all([this.loginWithCookie(), this.initTemplates()]);
		},
		trackPage(): void {
			this.uiStore.currentView = this.$route.name || '';
			if (this.$route && this.$route.meta && this.$route.meta.templatesEnabled) {
				this.templatesStore.setSessionId();
			} else {
				this.templatesStore.resetSessionId(); // reset telemetry session id when user leaves template pages
			}

			this.$telemetry.page(this.$route);
		},
		authenticate() {
			// redirect to setup page. user should be redirected to this only once
			if (this.settingsStore.isUserManagementEnabled && this.settingsStore.showSetupPage) {
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
			const user = this.usersStore.currentUser;
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
				if (redirect.startsWith('/')) {
					// protect against phishing
					this.$router.replace(redirect);
					return;
				}
			}

			// if cannot access page and is logged in
			this.$router.replace({ name: VIEWS.HOMEPAGE });
		},
		redirectIfNecessary() {
			const redirect =
				this.$route.meta &&
				typeof this.$route.meta.getRedirect === 'function' &&
				this.$route.meta.getRedirect();
			if (redirect) {
				this.$router.replace(redirect);
			}
		},
		setTheme() {
			const theme = window.localStorage.getItem(LOCAL_STORAGE_THEME);
			if (theme) {
				window.document.body.classList.add(`theme-${theme}`);
			}
		},
		trackExperiments() {
			const assumption = window.posthog?.getFeatureFlag?.(POSTHOG_ASSUMPTION_TEST);
			const isVideo = assumption === 'assumption-video';
			const isDemo = assumption === 'assumption-demo';

			if (isVideo) {
				this.$telemetry.track('User is part of video experiment');
			} else if (isDemo) {
				this.$telemetry.track('User is part of demo experiment');
			}
		},
	},
	async mounted() {
		this.setTheme();
		await this.initialize();
		this.logHiringBanner();
		this.authenticate();
		this.redirectIfNecessary();

		this.loading = false;

		this.trackPage();
		this.$externalHooks().run('app.mount');

		if (this.defaultLocale !== 'en') {
			await this.nodeTypesStore.getNodeTranslationHeaders();
		}

		setTimeout(() => {
			this.trackExperiments();
		}, 0);
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
.app {
	height: 100vh;
	overflow: hidden;
}

.container {
	display: grid;
	grid-template-areas:
		'sidebar header'
		'sidebar content';
	grid-auto-columns: fit-content($sidebar-expanded-width) 1fr;
	grid-template-rows: fit-content($sidebar-width) 1fr;
}

.content {
	display: flex;
	grid-area: content;
	overflow: auto;
	height: 100vh;
	width: 100%;
	justify-content: center;
}

.header {
	grid-area: header;
	z-index: 999;
}

.sidebar {
	grid-area: sidebar;
	height: 100vh;
	z-index: 999;
}
</style>
