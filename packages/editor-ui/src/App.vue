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
			<div id="banners" :class="$style.banners">
				<banner-stack v-if="!isDemoMode" />
			</div>
			<div id="header" :class="$style.header">
				<router-view name="header"></router-view>
			</div>
			<div id="sidebar" :class="$style.sidebar">
				<router-view name="sidebar"></router-view>
			</div>
			<div id="content" :class="$style.content">
				<router-view v-slot="{ Component }">
					<keep-alive include="NodeView" :max="1">
						<component :is="Component" />
					</keep-alive>
				</router-view>
			</div>
			<Modals />
			<Telemetry />
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

import BannerStack from '@/components/banners/BannerStack.vue';
import Modals from '@/components/Modals.vue';
import LoadingView from '@/views/LoadingView.vue';
import Telemetry from '@/components/Telemetry.vue';
import { HIRING_BANNER, LOCAL_STORAGE_THEME, VIEWS } from '@/constants';

import { userHelpers } from '@/mixins/userHelpers';
import { loadLanguage } from '@/plugins/i18n';
import { useGlobalLinkActions, useTitleChange, useToast, useExternalHooks } from '@/composables';
import {
	useUIStore,
	useSettingsStore,
	useUsersStore,
	useRootStore,
	useTemplatesStore,
	useNodeTypesStore,
	useCloudPlanStore,
	useSourceControlStore,
	useUsageStore,
} from '@/stores';
import { useHistoryHelper } from '@/composables/useHistoryHelper';
import { newVersions } from '@/mixins/newVersions';
import { useRoute } from 'vue-router';
import { ExpressionEvaluatorProxy } from 'n8n-workflow';

export default defineComponent({
	name: 'App',
	components: {
		BannerStack,
		LoadingView,
		Telemetry,
		Modals,
	},
	mixins: [newVersions, userHelpers],
	setup(props) {
		return {
			...useGlobalLinkActions(),
			...useHistoryHelper(useRoute()),
			...useToast(),
			externalHooks: useExternalHooks(),
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			...newVersions.setup?.(props),
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
			useSourceControlStore,
			useCloudPlanStore,
			useUsageStore,
		),
		defaultLocale(): string {
			return this.rootStore.defaultLocale;
		},
		isDemoMode(): boolean {
			return this.$route.name === VIEWS.DEMO;
		},
	},
	data() {
		return {
			postAuthenticateDone: false,
			settingsInitialized: false,
			loading: true,
		};
	},
	methods: {
		async initSettings(): Promise<void> {
			// The settings should only be initialized once
			if (this.settingsInitialized) return;

			try {
				await this.settingsStore.getSettings();
				this.settingsInitialized = true;
				// Re-compute title since settings are now available
				useTitleChange().titleReset();
			} catch (e) {
				this.showToast({
					title: this.$locale.baseText('startupError'),
					message: this.$locale.baseText('startupError.message'),
					type: 'error',
					duration: 0,
					dangerouslyUseHTMLString: true,
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
			if (this.settingsStore.isHiringBannerEnabled && !this.isDemoMode) {
				console.log(HIRING_BANNER);
			}
		},
		async checkForCloudData() {
			await this.cloudPlanStore.checkForCloudPlanData();
			await this.cloudPlanStore.fetchUserCloudAccount();
		},
		async initialize(): Promise<void> {
			await this.initSettings();
			ExpressionEvaluatorProxy.setEvaluator(useSettingsStore().settings.expressions.evaluator);
			await Promise.all([this.loginWithCookie(), this.initTemplates()]);
		},
		trackPage(): void {
			this.uiStore.currentView = this.$route.name || '';
			if (this.$route?.meta?.templatesEnabled) {
				this.templatesStore.setSessionId();
			} else {
				this.templatesStore.resetSessionId(); // reset telemetry session id when user leaves template pages
			}

			this.$telemetry.page(this.$route);
		},
		async authenticate() {
			// redirect to setup page. user should be redirected to this only once
			if (this.settingsStore.showSetupPage) {
				if (this.$route.name === VIEWS.SETUP) {
					return;
				}

				return this.$router.replace({ name: VIEWS.SETUP });
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
				return this.$router.replace({ name: VIEWS.SIGNIN, query: { redirect } });
			}

			// if cannot access page and is logged in, respect signin redirect
			if (this.$route.name === VIEWS.SIGNIN && typeof this.$route.query.redirect === 'string') {
				const redirect = decodeURIComponent(this.$route.query.redirect);
				if (redirect.startsWith('/')) {
					// protect against phishing
					return this.$router.replace(redirect);
				}
			}

			// if cannot access page and is logged in
			return this.$router.replace({ name: VIEWS.HOMEPAGE });
		},
		async redirectIfNecessary() {
			const redirect =
				this.$route.meta &&
				typeof this.$route.meta.getRedirect === 'function' &&
				this.$route.meta.getRedirect();

			if (redirect) {
				return this.$router.replace(redirect);
			}
			return;
		},
		setTheme() {
			const theme = window.localStorage.getItem(LOCAL_STORAGE_THEME);
			if (theme) {
				window.document.body.classList.add(`theme-${theme}`);
			}
		},
		async postAuthenticate() {
			if (this.postAuthenticateDone) {
				return;
			}

			if (!this.usersStore.currentUser) {
				return;
			}

			if (this.sourceControlStore.isEnterpriseSourceControlEnabled) {
				await this.sourceControlStore.getPreferences();
			}

			this.postAuthenticateDone = true;
		},
	},
	async created() {
		this.setTheme();
		await this.initialize();
		this.logHiringBanner();
		await this.authenticate();
		await this.redirectIfNecessary();
		void this.checkForNewVersions();
		await this.checkForCloudData();
		void this.postAuthenticate();

		this.loading = false;

		this.trackPage();
		void this.externalHooks.run('app.mount');

		if (this.defaultLocale !== 'en') {
			await this.nodeTypesStore.getNodeTranslationHeaders();
		}
	},
	watch: {
		'usersStore.currentUser'(currentValue, previousValue) {
			if (currentValue && !previousValue) {
				void this.postAuthenticate();
			}
		},
		async $route(route) {
			await this.initSettings();
			await this.redirectIfNecessary();

			this.trackPage();
		},
		defaultLocale(newLocale) {
			void loadLanguage(newLocale);
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
		'banners banners'
		'sidebar header'
		'sidebar content';
	grid-auto-columns: fit-content($sidebar-expanded-width) 1fr;
	grid-template-rows: auto fit-content($header-height) 1fr;
	height: 100vh;
}

.banners {
	grid-area: banners;
	z-index: 999;
}

.content {
	display: flex;
	grid-area: content;
	overflow: auto;
	height: 100%;
	width: 100%;
	justify-content: center;

	main {
		width: 100%;
		height: 100%;
	}
}

.header {
	grid-area: header;
	z-index: 99;
}

.sidebar {
	grid-area: sidebar;
	height: 100%;
	z-index: 999;
}
</style>
