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
			<div v-if="usersStore.currentUser" id="sidebar" :class="$style.sidebar">
				<router-view name="sidebar"></router-view>
			</div>
			<div id="content" :class="$style.content">
				<router-view v-slot="{ Component }">
					<keep-alive v-if="$route.meta.keepWorkflowAlive" include="NodeView" :max="1">
						<component :is="Component" />
					</keep-alive>
					<component v-else :is="Component" />
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
import { newVersions } from '@/mixins/newVersions';

import BannerStack from '@/components/banners/BannerStack.vue';
import Modals from '@/components/Modals.vue';
import LoadingView from '@/views/LoadingView.vue';
import Telemetry from '@/components/Telemetry.vue';
import { HIRING_BANNER, VIEWS } from '@/constants';

import { userHelpers } from '@/mixins/userHelpers';
import { loadLanguage } from '@/plugins/i18n';
import { useGlobalLinkActions, useToast, useExternalHooks } from '@/composables';
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
import { useRoute } from 'vue-router';
import { runExternalHook } from '@/utils';
import { initializeAuthenticatedFeatures } from '@/init';

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
			onAfterAuthenticateInitialized: false,
			loading: true,
		};
	},
	methods: {
		logHiringBanner() {
			if (this.settingsStore.isHiringBannerEnabled && !this.isDemoMode) {
				console.log(HIRING_BANNER);
			}
		},
	},
	async mounted() {
		this.logHiringBanner();

		void this.checkForNewVersions();
		void initializeAuthenticatedFeatures();

		void runExternalHook('app.mount');
		this.loading = false;
	},
	watch: {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		async 'usersStore.currentUser'(currentValue, previousValue) {
			if (currentValue && !previousValue) {
				await initializeAuthenticatedFeatures();
			}
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
