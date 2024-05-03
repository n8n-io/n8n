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
				<BannerStack v-if="!isDemoMode" />
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
					<component :is="Component" v-else />
				</router-view>
			</div>
			<div id="chat" :class="{ [$style.chat]: true, [$style.open]: aiStore.assistantChatOpen }">
				<AIAssistantChat v-if="aiStore.assistantChatOpen" />
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
import { HIRING_BANNER, VIEWS } from '@/constants';

import { userHelpers } from '@/mixins/userHelpers';
import { loadLanguage } from '@/plugins/i18n';
import useGlobalLinkActions from '@/composables/useGlobalLinkActions';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useToast } from '@/composables/useToast';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsageStore } from '@/stores/usage.store';
import { useUsersStore } from '@/stores/users.store';
import { useHistoryHelper } from '@/composables/useHistoryHelper';
import { useRoute } from 'vue-router';
import { initializeAuthenticatedFeatures } from '@/init';
import { useAIStore } from './stores/ai.store';
import AIAssistantChat from './components/AIAssistantChat/AIAssistantChat.vue';

export default defineComponent({
	name: 'App',
	components: {
		BannerStack,
		LoadingView,
		Telemetry,
		Modals,
		AIAssistantChat,
	},
	mixins: [userHelpers],
	setup() {
		return {
			...useGlobalLinkActions(),
			...useHistoryHelper(useRoute()),
			...useToast(),
			externalHooks: useExternalHooks(),
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
			useAIStore,
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
	async mounted() {
		this.logHiringBanner();

		void initializeAuthenticatedFeatures();

		void useExternalHooks().run('app.mount');
		this.loading = false;
	},
	methods: {
		logHiringBanner() {
			if (this.settingsStore.isHiringBannerEnabled && !this.isDemoMode) {
				console.log(HIRING_BANNER);
			}
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
		'banners banners banners'
		'sidebar header chat'
		'sidebar content chat';
	grid-auto-columns: fit-content($sidebar-expanded-width) 1fr fit-content($chat-width);
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
.chat {
	grid-area: chat;
	z-index: 999;
	height: 100%;
	width: 0;
	transition: all 0.2s ease-in-out;

	&.open {
		width: $chat-width;
	}
}
</style>
