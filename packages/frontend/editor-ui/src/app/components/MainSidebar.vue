<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nScrollArea, N8nResizeWrapper, type IMenuItem } from '@n8n/design-system';
import {
	ABOUT_MODAL_KEY,
	EXPERIMENT_TEMPLATE_RECO_V2_KEY,
	EXPERIMENT_TEMPLATE_RECO_V3_KEY,
	VIEWS,
	WHATS_NEW_MODAL_KEY,
	EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY,
} from '@/app/constants';
import { EXTERNAL_LINKS } from '@/app/constants/externalLinks';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useVersionsStore } from '@/app/stores/versions.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useBugReporting } from '@/app/composables/useBugReporting';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useKeybindings } from '@/app/composables/useKeybindings';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import { useSidebarLayout } from '@/app/composables/useSidebarLayout';
import { useSettingsItems } from '@/app/composables/useSettingsItems';
import { usePersonalizedTemplatesV2Store } from '@/experiments/templateRecoV2/stores/templateRecoV2.store';
import { usePersonalizedTemplatesV3Store } from '@/experiments/personalizedTemplatesV3/stores/personalizedTemplatesV3.store';
import { useTemplatesDataQualityStore } from '@/experiments/templatesDataQuality/stores/templatesDataQuality.store';
import MainSidebarHeader from '@/app/components/MainSidebarHeader.vue';
import BottomMenu from '@/app/components/BottomMenu.vue';
import MainSidebarSourceControl from '@/app/components/MainSidebarSourceControl.vue';
import MainSidebarTrialUpgrade from '@/app/components/MainSidebarTrialUpgrade.vue';
import ProjectNavigation from '@/features/collaboration/projects/components/ProjectNavigation.vue';
import TemplateTooltip from '@/experiments/personalizedTemplatesV3/components/TemplateTooltip.vue';
import { TemplateClickSource, trackTemplatesClick } from '@/experiments/utils';

const cloudPlanStore = useCloudPlanStore();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const templatesStore = useTemplatesStore();
const uiStore = useUIStore();
const versionsStore = useVersionsStore();
const workflowsStore = useWorkflowsStore();
const personalizedTemplatesV2Store = usePersonalizedTemplatesV2Store();
const personalizedTemplatesV3Store = usePersonalizedTemplatesV3Store();
const templatesDataQualityStore = useTemplatesDataQualityStore();

const i18n = useI18n();
const router = useRouter();
const telemetry = useTelemetry();
const pageRedirectionHelper = usePageRedirectionHelper();
const { getReportingURL } = useBugReporting();
const calloutHelpers = useCalloutHelpers();
const { isCollapsed, sidebarWidth, onResizeStart, onResize, onResizeEnd, toggleCollapse } =
	useSidebarLayout();

const { settingsItems } = useSettingsItems();

// Component data
const basePath = ref('');

const showWhatsNewNotification = computed(
	() =>
		versionsStore.hasVersionUpdates ||
		versionsStore.whatsNewArticles.some(
			(article) => !versionsStore.isWhatsNewArticleRead(article.id),
		),
);

const isTemplatesExperimentEnabled = computed(() => {
	return (
		personalizedTemplatesV2Store.isFeatureEnabled() ||
		personalizedTemplatesV3Store.isFeatureEnabled() ||
		templatesDataQualityStore.isFeatureEnabled()
	);
});

const mainMenuItems = computed<IMenuItem[]>(() => [
	{
		id: 'cloud-admin',
		position: 'bottom',
		label: 'Admin Panel',
		icon: 'cloud',
		available: settingsStore.isCloudDeployment && hasPermission(['instanceOwner']),
	},
	{
		// Link to in-app pre-built agent templates, available experiment is enabled
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('generic.templates'),
		position: 'bottom',
		available:
			settingsStore.isTemplatesEnabled &&
			calloutHelpers.isPreBuiltAgentsCalloutVisible.value &&
			!isTemplatesExperimentEnabled.value,
		route: { to: { name: VIEWS.PRE_BUILT_AGENT_TEMPLATES } },
	},
	{
		// Link to personalized template modal, available when V2, V3 or data quality experiment is enabled
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('generic.templates'),
		position: 'bottom',
		available: settingsStore.isTemplatesEnabled && isTemplatesExperimentEnabled.value,
	},
	{
		// Link to in-app templates, available if custom templates are enabled and experiment is disabled
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('generic.templates'),
		position: 'bottom',
		available:
			settingsStore.isTemplatesEnabled &&
			!calloutHelpers.isPreBuiltAgentsCalloutVisible.value &&
			templatesStore.hasCustomTemplatesHost &&
			!isTemplatesExperimentEnabled.value,
		route: { to: { name: VIEWS.TEMPLATES } },
	},
	{
		// Link to website templates, available if custom templates are not enabled
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('generic.templates'),
		position: 'bottom',
		available:
			settingsStore.isTemplatesEnabled &&
			!calloutHelpers.isPreBuiltAgentsCalloutVisible.value &&
			!templatesStore.hasCustomTemplatesHost &&
			!isTemplatesExperimentEnabled.value,
		link: {
			href: templatesStore.websiteTemplateRepositoryURL,
			target: '_blank',
		},
	},
	{
		id: 'insights',
		icon: 'chart-column-decreasing',
		label: 'Insights',
		position: 'bottom',
		route: { to: { name: VIEWS.INSIGHTS } },
		available:
			settingsStore.isModuleActive('insights') &&
			hasPermission(['rbac'], { rbac: { scope: 'insights:list' } }),
	},
	{
		id: 'help',
		icon: 'circle-help',
		label: i18n.baseText('mainSidebar.help'),
		notification: showWhatsNewNotification.value,
		position: 'bottom',
		children: [
			{
				id: 'quickstart',
				icon: 'video',
				label: i18n.baseText('mainSidebar.helpMenuItems.quickstart'),
				link: {
					href: EXTERNAL_LINKS.QUICKSTART_VIDEO,
					target: '_blank',
				},
			},
			{
				id: 'docs',
				icon: 'book',
				label: i18n.baseText('mainSidebar.helpMenuItems.documentation'),
				link: {
					href: EXTERNAL_LINKS.DOCUMENTATION,
					target: '_blank',
				},
			},
			{
				id: 'forum',
				icon: 'users',
				label: i18n.baseText('mainSidebar.helpMenuItems.forum'),
				link: {
					href: EXTERNAL_LINKS.FORUM,
					target: '_blank',
				},
			},
			{
				id: 'examples',
				icon: 'graduation-cap',
				label: i18n.baseText('mainSidebar.helpMenuItems.course'),
				link: {
					href: EXTERNAL_LINKS.COURSES,
					target: '_blank',
				},
			},
			{
				id: 'report-bug',
				icon: 'bug',
				label: i18n.baseText('mainSidebar.helpMenuItems.reportBug'),
				link: {
					href: getReportingURL(),
					target: '_blank',
				},
			},
			{
				id: 'about',
				icon: 'info',
				label: i18n.baseText('mainSidebar.aboutN8n'),
				position: 'bottom',
			},
		],
	},
	{
		id: 'settings',
		label: i18n.baseText('mainSidebar.settings'),
		icon: 'settings',
		available: true,
		children: settingsItems.value,
	},
]);

const visibleMenuItems = computed<IMenuItem[]>(() =>
	mainMenuItems.value.filter((item) => item.available !== false),
);

onMounted(() => {
	basePath.value = rootStore.baseUrl;
});

const trackHelpItemClick = (itemType: string) => {
	telemetry.track('User clicked help resource', {
		type: itemType,
		workflow_id: workflowsStore.workflowId,
	});
};

function openCommandBar(event: MouseEvent) {
	event.stopPropagation();

	void nextTick(() => {
		const keyboardEvent = new KeyboardEvent('keydown', {
			key: 'k',
			code: 'KeyK',
			metaKey: true,
			bubbles: true,
			cancelable: true,
		});
		document.dispatchEvent(keyboardEvent);
	});
}

const handleSelect = (key: string) => {
	switch (key) {
		case 'templates':
			if (templatesDataQualityStore.isFeatureEnabled()) {
				uiStore.openModal(EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY);
				trackTemplatesClick(TemplateClickSource.sidebarButton);
			} else if (personalizedTemplatesV3Store.isFeatureEnabled()) {
				personalizedTemplatesV3Store.markTemplateRecommendationInteraction();
				uiStore.openModalWithData({
					name: EXPERIMENT_TEMPLATE_RECO_V3_KEY,
					data: {},
				});
				trackTemplatesClick(TemplateClickSource.sidebarButton);
			} else if (personalizedTemplatesV2Store.isFeatureEnabled()) {
				uiStore.openModalWithData({
					name: EXPERIMENT_TEMPLATE_RECO_V2_KEY,
					data: {},
				});
				trackTemplatesClick(TemplateClickSource.sidebarButton);
			} else if (settingsStore.isTemplatesEnabled && !templatesStore.hasCustomTemplatesHost) {
				trackTemplatesClick(TemplateClickSource.sidebarButton);
			}
			break;
		case 'about': {
			trackHelpItemClick('about');
			uiStore.openModal(ABOUT_MODAL_KEY);
			break;
		}
		case 'cloud-admin': {
			void pageRedirectionHelper.goToDashboard();
			break;
		}
		case 'quickstart':
		case 'docs':
		case 'forum':
		case 'examples': {
			trackHelpItemClick(key);
			break;
		}
		case 'insights':
			telemetry.track('User clicked insights link from side menu');
			break;
		default:
			if (key.startsWith('whats-new-article-')) {
				const articleId = Number(key.replace('whats-new-article-', ''));

				telemetry.track("User clicked on what's new section", {
					article_id: articleId,
				});
				uiStore.openModalWithData({
					name: WHATS_NEW_MODAL_KEY,
					data: {
						articleId,
					},
				});
			}

			break;
	}
};

const onLogout = () => {
	void router.push({ name: VIEWS.SIGNOUT });
};

useKeybindings({
	ctrl_alt_o: () => handleSelect('about'),
	['bracketleft']: () => toggleCollapse(),
});
</script>

<template>
	<N8nResizeWrapper
		id="side-menu"
		:class="{
			[$style.sideMenu]: true,
			[$style.sideMenuCollapsed]: isCollapsed,
		}"
		:width="sidebarWidth"
		:style="{ width: `${sidebarWidth}px` }"
		:supported-directions="['right']"
		:min-width="200"
		:max-width="500"
		:grid-size="8"
		@resizestart="onResizeStart"
		@resize="onResize"
		@resizeend="onResizeEnd"
	>
		<MainSidebarHeader
			:is-collapsed="isCollapsed"
			@collapse="toggleCollapse"
			@open-command-bar="openCommandBar"
		/>
		<N8nScrollArea as-child>
			<div :class="$style.scrollArea">
				<ProjectNavigation
					:collapsed="isCollapsed"
					:plan-name="cloudPlanStore.currentPlanData?.displayName"
				/>
				<BottomMenu
					:items="visibleMenuItems"
					:is-collapsed="isCollapsed"
					@logout="onLogout"
					@select="handleSelect"
				/>
			</div>
		</N8nScrollArea>
		<MainSidebarSourceControl :is-collapsed="isCollapsed" />
		<MainSidebarTrialUpgrade />
		<TemplateTooltip />
	</N8nResizeWrapper>
</template>

<style lang="scss" module>
.sideMenu {
	position: relative;
	height: 100%;
	display: flex;
	flex-direction: column;
	border-right: var(--border);
	background-color: var(--menu--color--background, var(--color--background--light-2));

	&.sideMenuCollapsed {
		width: $sidebar-width;
		min-width: auto;
	}
}

.scrollArea {
	height: 100%;
	display: flex;
	flex-direction: column;
}
</style>
