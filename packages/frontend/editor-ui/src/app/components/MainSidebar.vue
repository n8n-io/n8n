<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, nextTick, type Ref } from 'vue';
import { onClickOutside, type VueInstance } from '@vueuse/core';

import { useI18n } from '@n8n/i18n';
import {
	N8nNavigationDropdown,
	N8nTooltip,
	N8nLink,
	N8nIconButton,
	N8nMenuItem,
	isCustomMenuItem,
	N8nLogo,
	N8nPopoverReka,
	N8nScrollArea,
	N8nText,
	N8nIcon,
	N8nButton,
	N8nResizeWrapper,
} from '@n8n/design-system';
import type { IMenuItem, IMenuElement } from '@n8n/design-system';
import {
	ABOUT_MODAL_KEY,
	EXPERIMENT_TEMPLATE_RECO_V2_KEY,
	EXPERIMENT_TEMPLATE_RECO_V3_KEY,
	RELEASE_NOTES_URL,
	VIEWS,
	WHATS_NEW_MODAL_KEY,
	EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY,
} from '@/app/constants';
import { EXTERNAL_LINKS } from '@/app/constants/externalLinks';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useVersionsStore } from '@/app/stores/versions.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useBugReporting } from '@/app/composables/useBugReporting';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useGlobalEntityCreation } from '@/app/composables/useGlobalEntityCreation';
import { useBecomeTemplateCreatorStore } from '@/app/components/BecomeTemplateCreatorCta/becomeTemplateCreatorStore';
import BecomeTemplateCreatorCta from '@/app/components/BecomeTemplateCreatorCta/BecomeTemplateCreatorCta.vue';
import VersionUpdateCTA from '@/app/components/VersionUpdateCTA.vue';
import { TemplateClickSource, trackTemplatesClick } from '@/experiments/utils';
import { I18nT } from 'vue-i18n';
import { usePersonalizedTemplatesV2Store } from '@/experiments/templateRecoV2/stores/templateRecoV2.store';
import { usePersonalizedTemplatesV3Store } from '@/experiments/personalizedTemplatesV3/stores/personalizedTemplatesV3.store';
import { useTemplatesDataQualityStore } from '@/experiments/templatesDataQuality/stores/templatesDataQuality.store';
import { useKeybindings } from '@/app/composables/useKeybindings';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import ProjectNavigation from '@/features/collaboration/projects/components/ProjectNavigation.vue';
import KeyboardShortcutTooltip from './KeyboardShortcutTooltip.vue';
import { useCommandBar } from '@/features/shared/commandBar/composables/useCommandBar';
import MainSidebarSourceControl from './MainSidebarSourceControl.vue';
import MainSidebarTrialUpgrade from './MainSidebarTrialUpgrade.vue';
import TemplateTooltip from '@/experiments/personalizedTemplatesV3/components/TemplateTooltip.vue';
import { useSidebarLayout } from '../composables/useSidebarLayout';
import { useSettingsItems } from '../composables/useSettingsItems';
import { useRouter } from 'vue-router';

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

useKeybindings({
	ctrl_alt_o: () => handleSelect('about'),
	['bracketleft']: () => toggleCollapse(),
});

const { isEnabled: isCommandBarEnabled } = useCommandBar();

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

const whatsNewItems = computed<{ available: boolean; children: IMenuElement[] }>(() => ({
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
			available: versionsStore.hasVersionUpdates && usersStore.canUserUpdateVersion,
			props: {
				tooltipText: !usersStore.canUserUpdateVersion
					? i18n.baseText('whatsNew.updateNudgeTooltip')
					: undefined,
			},
		},
	],
}));

const createBtn = ref<InstanceType<typeof N8nNavigationDropdown>>();

const userIsTrialing = computed(() => cloudPlanStore.userIsTrialing);

onMounted(() => {
	basePath.value = rootStore.baseUrl;

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

const {
	menu,
	handleSelect: handleMenuSelect,
	createProjectAppendSlotName,
	createWorkflowsAppendSlotName,
	createCredentialsAppendSlotName,
	projectsLimitReachedMessage,
	upgradeLabel,
	hasPermissionToCreateProjects,
} = useGlobalEntityCreation();
onClickOutside(createBtn as Ref<VueInstance>, () => {
	createBtn.value?.close();
});

const onLogout = () => {
	void router.push({ name: VIEWS.SIGNOUT });
};
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
		<div :class="$style.header">
			<N8nLogo
				v-if="!isCollapsed"
				:class="$style.logo"
				size="small"
				:collapsed="isCollapsed"
				:release-channel="settingsStore.settings.releaseChannel"
			>
				<N8nTooltip
					v-if="sourceControlStore.preferences.branchReadOnly && !isCollapsed"
					placement="bottom"
				>
					<template #content>
						<I18nT keypath="readOnlyEnv.tooltip" scope="global">
							<template #link>
								<N8nLink
									to="https://docs.n8n.io/source-control-environments/setup/#step-4-connect-n8n-and-configure-your-instance"
									size="small"
								>
									{{ i18n.baseText('readOnlyEnv.tooltip.link') }}
								</N8nLink>
							</template>
						</I18nT>
					</template>
					<N8nIcon
						data-test-id="read-only-env-icon"
						icon="lock"
						:class="$style.readOnlyEnvironmentIcon"
					/>
				</N8nTooltip>
			</N8nLogo>
			<KeyboardShortcutTooltip
				:placement="isCollapsed ? 'right' : 'bottom'"
				:label="
					isCollapsed
						? i18n.baseText('mainSidebar.state.expand')
						: i18n.baseText('mainSidebar.state.collapse')
				"
				show-after="500"
				:shortcut="{ keys: ['['] }"
			>
				<N8nIconButton
					id="toggle-sidebar-button"
					size="small"
					type="highlight"
					icon="panel-left"
					icon-size="large"
					aria-label="Toggle sidebar"
					@click="toggleCollapse"
				/>
			</KeyboardShortcutTooltip>
			<N8nNavigationDropdown
				ref="createBtn"
				data-test-id="universal-add"
				:menu="menu"
				@select="handleMenuSelect"
			>
				<N8nIconButton
					size="small"
					type="highlight"
					icon="plus"
					icon-size="large"
					aria-label="Add new item"
				/>
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
			<KeyboardShortcutTooltip
				v-if="isCommandBarEnabled"
				:placement="isCollapsed ? 'right' : 'bottom'"
				show-after="500"
				:label="i18n.baseText('nodeView.openCommandBar')"
				:shortcut="{ keys: ['k'], metaKey: true }"
			>
				<N8nIconButton
					size="small"
					type="highlight"
					icon="search"
					icon-size="large"
					aria-label="Open command palette"
					@click="openCommandBar"
				/>
			</KeyboardShortcutTooltip>
		</div>
		<N8nScrollArea as-child>
			<div :class="$style.scrollArea">
				<ProjectNavigation
					:collapsed="isCollapsed"
					:plan-name="cloudPlanStore.currentPlanData?.displayName"
				/>
				<div :class="$style.bottomMenu">
					<div :class="$style.bottomMenuItems">
						<template v-for="item in visibleMenuItems" :key="item.id">
							<!-- Help popover -->
							<N8nPopoverReka
								v-if="item.children && item.id === 'help'"
								key="help"
								side="right"
								align="end"
								:side-offset="12"
							>
								<template #content>
									<div :class="$style.popover">
										<BecomeTemplateCreatorCta v-if="!isCollapsed && !userIsTrialing" />
										<template v-for="child in item.children" :key="child.id">
											<component
												:is="child.component"
												v-if="isCustomMenuItem(child)"
												v-bind="child.props"
											/>
											<N8nMenuItem v-else :item="child" @click="() => handleSelect(child.id)" />
										</template>
										<template v-if="whatsNewItems.available">
											<N8nText bold size="small" :class="$style.popoverTitle" color="text-light"
												>What's new</N8nText
											>
											<template v-for="child in whatsNewItems.children" :key="child.id">
												<component
													:is="child.component"
													v-if="isCustomMenuItem(child)"
													v-bind="child.props"
												/>
												<N8nMenuItem v-else :item="child" @click="() => handleSelect(child.id)" />
											</template>
										</template>
									</div>
								</template>
								<template #trigger>
									<N8nMenuItem
										:data-test-id="`main-sidebar-${item.id}`"
										:item="item"
										:compact="isCollapsed"
										@click="() => handleSelect(item.id)"
									/>
								</template>
							</N8nPopoverReka>
							<!-- Settings popover -->
							<N8nPopoverReka
								v-else-if="item.children && item.id === 'settings'"
								key="settings"
								side="right"
								align="end"
								:side-offset="12"
							>
								<template #content>
									<div :class="$style.popover">
										<template v-for="child in item.children" :key="child.id">
											<component
												:is="child.component"
												v-if="isCustomMenuItem(child)"
												v-bind="child.props"
											/>
											<N8nMenuItem v-else :item="child" @click="() => handleSelect(child.id)" />
										</template>
										<span :class="$style.divider" />
										<N8nMenuItem
											:data-test-id="'main-sidebar-log-out'"
											:item="{ id: 'sign-out', label: 'Sign out', icon: 'door-open' }"
											@click="onLogout"
										/>
									</div>
								</template>
								<template #trigger>
									<N8nMenuItem
										:data-test-id="`main-sidebar-${item.id}`"
										:item="item"
										:compact="isCollapsed"
										@click="() => handleSelect(item.id)"
									/>
								</template>
							</N8nPopoverReka>
							<!-- Items without children -->
							<N8nMenuItem
								v-else
								:data-test-id="`main-sidebar-${item.id}`"
								:item="item"
								:compact="isCollapsed"
								@click="() => handleSelect(item.id)"
							/>
						</template>
					</div>
				</div>
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

	.header {
		display: flex;
		align-items: center;
		padding: var(--spacing--2xs) var(--spacing--3xs);
		margin-bottom: var(--spacing--2xs);
		justify-content: space-between;
		gap: var(--spacing--4xs);

		img {
			position: relative;
			left: 1px;
			height: 20px;
			margin-right: auto;
		}
	}

	&.sideMenuCollapsed {
		width: $sidebar-width;
		min-width: auto;

		.header {
			flex-direction: column;
			border-bottom: var(--border);
		}
	}
}

.logo {
	margin-right: auto;
}

.scrollArea {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.bottomMenu {
	display: flex;
	flex-direction: column;
	margin-top: auto;
}

.sideMenuCollapsed .bottomMenu {
	border-top: var(--border);
}

.bottomMenuItems {
	padding: var(--spacing--3xs);
}

.popover {
	padding: var(--spacing--4xs);
	min-width: 260px;
	border-radius: var(--radius);
	background-color: var(--menu--color--background, var(--color--background--light-2));
}

.divider {
	display: block;
	width: 100%;
	padding-top: var(--spacing--3xs);
	border-bottom: var(--border);
	margin-bottom: var(--spacing--3xs);
	background-color: var(--color--border);
}

.popoverTitle {
	display: block;
	margin-bottom: var(--spacing--3xs);
	padding-left: var(--spacing--3xs);
	margin-top: var(--spacing--xs);
}

@media screen and (max-height: 470px) {
	:global(#help) {
		display: none;
	}
}

.readOnlyEnvironmentIcon {
	display: inline-block;
	color: white;
	background-color: var(--color--warning);
	align-self: center;
	padding: 2px;
	border-radius: var(--radius--sm);
	margin: 7px 12px 0 5px;
}
</style>
