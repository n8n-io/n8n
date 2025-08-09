<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useI18n } from '@n8n/i18n';
import {
	N8nTooltip,
	N8nLink,
	N8nIconButton,
	N8nSidebar,
	N8nNavigationDropdown,
	N8nIcon,
	N8nButton,
} from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import { ABOUT_MODAL_KEY, RELEASE_NOTES_URL, VIEWS, WHATS_NEW_MODAL_KEY } from '@/constants';
import { hasPermission } from '@/utils/rbac/permissions';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useVersionsStore } from '@/stores/versions.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useDebounce } from '@/composables/useDebounce';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useTelemetry } from '@/composables/useTelemetry';
import { useUserHelpers } from '@/composables/useUserHelpers';
import { useBugReporting } from '@/composables/useBugReporting';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useBecomeTemplateCreatorStore } from '@/components/BecomeTemplateCreatorCta/becomeTemplateCreatorStore';
import VersionUpdateCTA from '@/components/VersionUpdateCTA.vue';
import { TemplateClickSource, trackTemplatesClick } from '@/utils/experiments';
import { I18nT } from 'vue-i18n';
import { useSidebarData } from '@/composables/useSidebarData';
import { useGlobalEntityCreation } from '@/composables/useGlobalEntityCreation';
import MainSidebarSourceControl from '@/components/MainSidebarSourceControl.vue';
import BecomeTemplateCreatorCta from './BecomeTemplateCreatorCta/BecomeTemplateCreatorCta.vue';

const becomeTemplateCreatorStore = useBecomeTemplateCreatorStore();
const cloudPlanStore = useCloudPlanStore();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const templatesStore = useTemplatesStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const versionsStore = useVersionsStore();
const workflowsStore = useWorkflowsStore();
const sourceControlStore = useSourceControlStore();

const externalHooks = useExternalHooks();
const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();
const pageRedirectionHelper = usePageRedirectionHelper();
const { getReportingURL } = useBugReporting();

useUserHelpers(router, route);

// Template refs
const user = ref<Element | null>(null);

// Component data
const basePath = ref('');
const fullyExpanded = ref(false);

// Use the sidebar data composable
const { personalItems, sharedItems, projects } = useSidebarData();

// Use global entity creation composable
const {
	menu,
	handleSelect: handleMenuSelect,
	createWorkflowsAppendSlotName,
	createCredentialsAppendSlotName,
	createProjectAppendSlotName,
	hasPermissionToCreateProjects,
	projectsLimitReachedMessage,
	upgradeLabel,
} = useGlobalEntityCreation();

const userMenuItems = ref([
	{
		id: 'settings',
		label: i18n.baseText('settings'),
	},
	{
		id: 'logout',
		label: i18n.baseText('auth.signout'),
	},
]);

const showWhatsNewNotification = computed(
	() =>
		versionsStore.hasVersionUpdates ||
		versionsStore.whatsNewArticles.some(
			(article) => !versionsStore.isWhatsNewArticleRead(article.id),
		),
);

const mainMenuItems = computed<IMenuItem[]>(() => [
	{
		id: 'cloud-admin',
		position: 'bottom',
		label: 'Admin Panel',
		icon: 'cloud',
		available: settingsStore.isCloudDeployment && hasPermission(['instanceOwner']),
	},
	{
		// Link to in-app templates, available if custom templates are enabled
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('mainSidebar.templates'),
		position: 'bottom',
		available: settingsStore.isTemplatesEnabled && templatesStore.hasCustomTemplatesHost,
		route: { to: { name: VIEWS.TEMPLATES } },
	},
	{
		// Link to website templates, available if custom templates are not enabled
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('mainSidebar.templates'),
		position: 'bottom',
		available: settingsStore.isTemplatesEnabled && !templatesStore.hasCustomTemplatesHost,
		link: {
			href: templatesStore.websiteTemplateRepositoryURL,
			target: '_blank',
		},
	},
	{
		id: 'variables',
		icon: 'variable',
		label: i18n.baseText('mainSidebar.variables'),
		position: 'bottom',
		route: { to: { name: VIEWS.VARIABLES } },
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
		position: 'bottom',
		children: [
			{
				id: 'quickstart',
				icon: 'video',
				label: i18n.baseText('mainSidebar.helpMenuItems.quickstart'),
				link: {
					href: 'https://www.youtube.com/watch?v=4cQWJViybAQ',
					target: '_blank',
				},
			},
			{
				id: 'docs',
				icon: 'book',
				label: i18n.baseText('mainSidebar.helpMenuItems.documentation'),
				link: {
					href: 'https://docs.n8n.io?utm_source=n8n_app&utm_medium=app_sidebar',
					target: '_blank',
				},
			},
			{
				id: 'forum',
				icon: 'users',
				label: i18n.baseText('mainSidebar.helpMenuItems.forum'),
				link: {
					href: 'https://community.n8n.io?utm_source=n8n_app&utm_medium=app_sidebar',
					target: '_blank',
				},
			},
			{
				id: 'examples',
				icon: 'graduation-cap',
				label: i18n.baseText('mainSidebar.helpMenuItems.course'),
				link: {
					href: 'https://docs.n8n.io/courses/',
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
		id: 'whats-new',
		icon: 'bell',
		notification: showWhatsNewNotification.value,
		label: i18n.baseText('mainSidebar.whatsNew'),
		position: 'bottom',
		available: versionsStore.hasVersionUpdates || versionsStore.whatsNewArticles.length > 0,
		children: [
			...versionsStore.whatsNewArticles.map(
				(article) =>
					({
						id: `whats-new-article-${article.id}`,
						label: article.title,
						size: 'small',
						customIconSize: 'small',
						icon: {
							type: 'emoji',
							value: '•',
							color: !versionsStore.isWhatsNewArticleRead(article.id) ? 'primary' : 'text-light',
						},
					}) satisfies IMenuItem,
			),
			{
				id: 'full-changelog',
				icon: 'external-link',
				label: i18n.baseText('mainSidebar.whatsNew.fullChangelog'),
				link: {
					href: RELEASE_NOTES_URL,
					target: '_blank',
				},
				size: 'small',
				customIconSize: 'small',
			},
			{
				id: 'version-upgrade-cta',
				component: VersionUpdateCTA,
				available: versionsStore.hasVersionUpdates,
				props: {},
			},
		],
	},
]);

const showUserArea = computed(() => hasPermission(['authenticated']));
const userIsTrialing = computed(() => cloudPlanStore.userIsTrialing);

onMounted(async () => {
	basePath.value = rootStore.baseUrl;
	if (user.value) {
		void externalHooks.run('mainSidebar.mounted', {
			userRef: user.value,
		});
	}

	becomeTemplateCreatorStore.startMonitoringCta();
});

onBeforeUnmount(() => {
	becomeTemplateCreatorStore.stopMonitoringCta();
});

const trackHelpItemClick = (itemType: string) => {
	telemetry.track('User clicked help resource', {
		type: itemType,
		workflow_id: workflowsStore.workflowId,
	});
};

const onUserActionToggle = (action: string) => {
	switch (action) {
		case 'logout':
			onLogout();
			break;
		case 'settings':
			void router.push({ name: VIEWS.SETTINGS });
			break;
		default:
			break;
	}
};

const onLogout = () => {
	void router.push({ name: VIEWS.SIGNOUT });
};

const handleSelect = (key: string) => {
	switch (key) {
		case 'templates':
			if (settingsStore.isTemplatesEnabled && !templatesStore.hasCustomTemplatesHost) {
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
</script>

<template>
	<N8nSidebar
		:personal="personalItems"
		:shared="sharedItems"
		:projects="projects"
		:release-channel="settingsStore.settings.releaseChannel"
	>
		<template #createButton>
			<N8nNavigationDropdown
				ref="createBtn"
				data-test-id="universal-add"
				:menu="menu"
				@select="handleMenuSelect"
			>
				<N8nIconButton icon-size="large" size="mini" icon="square-plus" type="secondary" text />
				<template #[createWorkflowsAppendSlotName]>
					<N8nTooltip
						v-if="sourceControlStore.preferences.branchReadOnly"
						placement="right"
						:content="i18n.baseText('readOnlyEnv.cantAdd.workflow')"
					>
						<N8nIcon style="margin-left: auto; margin-right: 5px" icon="lock" size="xsmall" />
					</N8nTooltip>
				</template>
				<template #[createCredentialsAppendSlotName]>
					<N8nTooltip
						v-if="sourceControlStore.preferences.branchReadOnly"
						placement="right"
						:content="i18n.baseText('readOnlyEnv.cantAdd.credential')"
					>
						<N8nIcon style="margin-left: auto; margin-right: 5px" icon="lock" size="xsmall" />
					</N8nTooltip>
				</template>
				<template #[createProjectAppendSlotName]="{ item }">
					<N8nTooltip
						v-if="sourceControlStore.preferences.branchReadOnly"
						placement="right"
						:content="i18n.baseText('readOnlyEnv.cantAdd.project')"
					>
						<N8nIcon style="margin-left: auto; margin-right: 5px" icon="lock" size="xsmall" />
					</N8nTooltip>
					<N8nTooltip
						v-else-if="item.disabled"
						placement="right"
						:content="projectsLimitReachedMessage"
					>
						<N8nIcon
							v-if="!hasPermissionToCreateProjects"
							style="margin-left: auto; margin-right: 5px"
							icon="lock"
							size="xsmall"
						/>
						<N8nButton
							v-else
							:size="'mini'"
							style="margin-left: auto"
							type="tertiary"
							@click="handleMenuSelect(item.id)"
						>
							{{ upgradeLabel }}
						</N8nButton>
					</N8nTooltip>
				</template>
			</N8nNavigationDropdown>
		</template>
		<template #creatorCallout>
			<BecomeTemplateCreatorCta v-if="fullyExpanded && !userIsTrialing" />
		</template>
		<template #sourceControl>
			<MainSidebarSourceControl :is-collapsed="false" />
		</template>
	</N8nSidebar>
</template>
