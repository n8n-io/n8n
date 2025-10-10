<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, nextTick, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
	N8nAvatar,
	N8nText,
	N8nIcon,
	N8nButton,
} from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import {
	ABOUT_MODAL_KEY,
	EXPERIMENT_TEMPLATE_RECO_V2_KEY,
	EXPERIMENT_TEMPLATE_RECO_V3_KEY,
	RELEASE_NOTES_URL,
	VIEWS,
	WHATS_NEW_MODAL_KEY,
} from '@/constants';
import { CHAT_VIEW } from '@/features/chatHub/constants';
import { hasPermission } from '@/utils/rbac/permissions';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';
import { useTemplatesStore } from '@/features/templates/templates.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useVersionsStore } from '@/stores/versions.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useDebounce } from '@/composables/useDebounce';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useTelemetry } from '@/composables/useTelemetry';
import { useUserHelpers } from '@/composables/useUserHelpers';
import { useBugReporting } from '@/composables/useBugReporting';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useGlobalEntityCreation } from '@/composables/useGlobalEntityCreation';
import { useBecomeTemplateCreatorStore } from '@/components/BecomeTemplateCreatorCta/becomeTemplateCreatorStore';
import BecomeTemplateCreatorCta from '@/components/BecomeTemplateCreatorCta/BecomeTemplateCreatorCta.vue';
import VersionUpdateCTA from '@/components/VersionUpdateCTA.vue';
import { TemplateClickSource, trackTemplatesClick } from '@/utils/experiments';
import { I18nT } from 'vue-i18n';
import { usePersonalizedTemplatesV2Store } from '@/experiments/templateRecoV2/stores/templateRecoV2.store';
import { usePersonalizedTemplatesV3Store } from '@/experiments/personalizedTemplatesV3/stores/personalizedTemplatesV3.store';
import TemplateTooltip from '@/experiments/personalizedTemplatesV3/components/TemplateTooltip.vue';
import { useKeybindings } from '@/composables/useKeybindings';
import { useCalloutHelpers } from '@/composables/useCalloutHelpers';
import ProjectNavigation from '@/features/projects/components/ProjectNavigation.vue';
import MainSidebarSourceControl from './MainSidebarSourceControl.vue';

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

const { callDebounced } = useDebounce();
const externalHooks = useExternalHooks();
const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();
const pageRedirectionHelper = usePageRedirectionHelper();
const { getReportingURL } = useBugReporting();
const calloutHelpers = useCalloutHelpers();

useKeybindings({
	ctrl_alt_o: () => handleSelect('about'),
});
useUserHelpers(router, route);

// Template refs
const user = ref<Element | null>(null);

// Component data
const basePath = ref('');
const fullyExpanded = ref(false);
const userMenuItems = ref<IMenuItem[]>([
	{
		id: 'settings',
		icon: 'settings',
		label: i18n.baseText('settings'),
	},
	{
		id: 'logout',
		icon: 'door-open',
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
		// Link to in-app pre-built agent templates, available experiment is enabled
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('mainSidebar.templates'),
		position: 'bottom',
		available:
			settingsStore.isTemplatesEnabled &&
			calloutHelpers.isPreBuiltAgentsCalloutVisible.value &&
			!(
				personalizedTemplatesV2Store.isFeatureEnabled() ||
				personalizedTemplatesV3Store.isFeatureEnabled()
			),
		route: { to: { name: VIEWS.PRE_BUILT_AGENT_TEMPLATES } },
	},
	{
		// Link to personalized template modal, available when V2 or V3 experiment is enabled
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('mainSidebar.templates'),
		position: 'bottom',
		available:
			settingsStore.isTemplatesEnabled &&
			(personalizedTemplatesV2Store.isFeatureEnabled() ||
				personalizedTemplatesV3Store.isFeatureEnabled()),
	},
	{
		// Link to in-app templates, available if custom templates are enabled and experiment is disabled
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('mainSidebar.templates'),
		position: 'bottom',
		available:
			settingsStore.isTemplatesEnabled &&
			!calloutHelpers.isPreBuiltAgentsCalloutVisible.value &&
			templatesStore.hasCustomTemplatesHost &&
			!(
				personalizedTemplatesV2Store.isFeatureEnabled() ||
				personalizedTemplatesV3Store.isFeatureEnabled()
			),
		route: { to: { name: VIEWS.TEMPLATES } },
	},
	{
		// Link to website templates, available if custom templates are not enabled
		id: 'templates',
		icon: 'package-open',
		label: i18n.baseText('mainSidebar.templates'),
		position: 'bottom',
		available:
			settingsStore.isTemplatesEnabled &&
			!calloutHelpers.isPreBuiltAgentsCalloutVisible.value &&
			!templatesStore.hasCustomTemplatesHost &&
			!(
				personalizedTemplatesV2Store.isFeatureEnabled() ||
				personalizedTemplatesV3Store.isFeatureEnabled()
			),
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
		id: 'chat',
		icon: 'bot',
		label: 'Chat',
		position: 'bottom',
		route: { to: { name: CHAT_VIEW } },
		available:
			settingsStore.isChatFeatureEnabled &&
			hasPermission(['rbac'], { rbac: { scope: 'chatHub:message' } }),
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
				props: {
					disabled: !usersStore.canUserUpdateVersion,
					tooltipText: !usersStore.canUserUpdateVersion
						? i18n.baseText('whatsNew.updateNudgeTooltip')
						: undefined,
				},
			},
		],
	},
]);

const visibleMenuItems = computed(() =>
	mainMenuItems.value.filter((item) => item.available !== false),
);

const createBtn = ref<InstanceType<typeof N8nNavigationDropdown>>();

const isCollapsed = computed(() => uiStore.sidebarMenuCollapsed);

const showUserArea = computed(() => hasPermission(['authenticated']));
const userIsTrialing = computed(() => cloudPlanStore.userIsTrialing);

onMounted(async () => {
	window.addEventListener('resize', onResize);
	basePath.value = rootStore.baseUrl;
	if (user.value) {
		void externalHooks.run('mainSidebar.mounted', {
			userRef: user.value,
		});
	}

	becomeTemplateCreatorStore.startMonitoringCta();

	await nextTick(onResizeEnd);
});

onBeforeUnmount(() => {
	becomeTemplateCreatorStore.stopMonitoringCta();
	window.removeEventListener('resize', onResize);
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

const toggleCollapse = () => {
	uiStore.toggleSidebarMenuCollapse();
	// When expanding, delay showing some element to ensure smooth animation
	if (!isCollapsed.value) {
		setTimeout(() => {
			fullyExpanded.value = !isCollapsed.value;
		}, 300);
	} else {
		fullyExpanded.value = !isCollapsed.value;
	}
};

const handleSelect = (key: string) => {
	switch (key) {
		case 'templates':
			if (personalizedTemplatesV3Store.isFeatureEnabled()) {
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

function onResize() {
	void callDebounced(onResizeEnd, { debounceTime: 250 });
}

async function onResizeEnd() {
	if (window.innerWidth < 900) {
		uiStore.sidebarMenuCollapsed = true;
	} else {
		uiStore.sidebarMenuCollapsed = uiStore.sidebarMenuCollapsedPreference;
	}

	void nextTick(() => {
		fullyExpanded.value = !isCollapsed.value;
	});
}

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
</script>

<template>
	<div
		id="side-menu"
		:class="{
			['side-menu']: true,
			[$style.sideMenu]: true,
			[$style.sideMenuCollapsed]: isCollapsed,
		}"
	>
		<div
			id="collapse-change-button"
			:class="['clickable', $style.sideMenuCollapseButton]"
			@click="toggleCollapse"
		>
			<N8nIcon v-if="isCollapsed" icon="chevron-right" size="xsmall" class="ml-5xs" />
			<N8nIcon v-else icon="chevron-left" size="xsmall" class="mr-5xs" />
		</div>
		<div :class="$style.logo">
			<N8nLogo
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
						size="xsmall"
						:class="$style.readOnlyEnvironmentIcon"
					/>
				</N8nTooltip>
			</N8nLogo>
			<N8nNavigationDropdown
				ref="createBtn"
				data-test-id="universal-add"
				:menu="menu"
				@select="handleMenuSelect"
			>
				<N8nIconButton icon="plus" type="secondary" outline />
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
		</div>
		<N8nScrollArea as-child>
			<div :class="$style.scrollArea">
				<ProjectNavigation
					:collapsed="isCollapsed"
					:plan-name="cloudPlanStore.currentPlanData?.displayName"
				/>

				<div :class="$style.bottomMenu">
					<BecomeTemplateCreatorCta v-if="fullyExpanded && !userIsTrialing" />
					<div :class="$style.bottomMenuItems">
						<template v-for="item in visibleMenuItems" :key="item.id">
							<N8nPopoverReka
								v-if="item.children"
								:key="item.id"
								side="right"
								align="end"
								:side-offset="16"
							>
								<template #content>
									<div :class="$style.popover">
										<N8nText :class="$style.popoverTitle" bold color="foreground-xdark">{{
											item.label
										}}</N8nText>
										<template v-for="child in item.children" :key="child.id">
											<component
												:is="child.component"
												v-if="isCustomMenuItem(child)"
												v-bind="child.props"
											/>
											<N8nMenuItem v-else :item="child" @click="() => handleSelect(child.id)" />
										</template>
									</div>
								</template>
								<template #trigger>
									<N8nMenuItem
										:item="item"
										:compact="isCollapsed"
										@click="() => handleSelect(item.id)"
									/>
								</template>
							</N8nPopoverReka>
							<N8nMenuItem
								v-else
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
		<div v-if="showUserArea">
			<div ref="user" :class="$style.userArea">
				<N8nPopoverReka side="right" align="end" :side-offset="16">
					<template #content>
						<div :class="$style.popover">
							<N8nMenuItem
								v-for="action in userMenuItems"
								:key="action.id"
								:item="action"
								:data-test-id="`user-menu-item-${action.id}`"
								@click="() => onUserActionToggle(action.id)"
							/>
						</div>
					</template>
					<template #trigger>
						<div :class="$style.userAreaInner">
							<div class="ml-3xs" data-test-id="main-sidebar-user-menu">
								<!-- This dropdown is only enabled when sidebar is collapsed -->
								<div :class="{ [$style.avatar]: true, ['clickable']: isCollapsed }">
									<N8nAvatar
										:first-name="usersStore.currentUser?.firstName"
										:last-name="usersStore.currentUser?.lastName"
										size="small"
									/>
								</div>
							</div>
							<div
								:class="{
									['ml-2xs']: true,
									[$style.userName]: true,
									[$style.expanded]: fullyExpanded,
								}"
							>
								<N8nText size="small" color="text-dark">{{
									usersStore.currentUser?.fullName
								}}</N8nText>
							</div>
							<div
								data-test-id="user-menu"
								:class="{ [$style.userActions]: true, [$style.expanded]: fullyExpanded }"
							>
								<N8nIconButton icon="ellipsis" text square type="tertiary" />
							</div>
						</div>
					</template>
				</N8nPopoverReka>
			</div>
		</div>

		<TemplateTooltip />
	</div>
</template>

<style lang="scss" module>
.sideMenu {
	position: relative;
	height: 100%;
	display: flex;
	flex-direction: column;
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
	width: $sidebar-expanded-width;
	background-color: var(--menu-background, var(--color--background--light-3));

	.logo {
		display: flex;
		align-items: center;
		padding: var(--spacing--xs);
		justify-content: space-between;

		img {
			position: relative;
			left: 1px;
			height: 20px;
		}
	}

	&.sideMenuCollapsed {
		width: $sidebar-width;
		min-width: auto;

		.logo {
			flex-direction: column;
			gap: 12px;
		}
	}
}

.scrollArea {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.sideMenuCollapseButton {
	position: absolute;
	right: -10px;
	top: 50%;
	z-index: 999;
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--color--text);
	background-color: var(--color--foreground--tint-2);
	width: 20px;
	height: 20px;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: 50%;

	&:hover {
		color: var(--color--primary--shade-1);
	}
}

.bottomMenu {
	display: flex;
	flex-direction: column;
	margin-top: auto;
}

.bottomMenuItems {
	padding: var(--spacing--xs);
}

.popover {
	padding: var(--spacing--xs);
	min-width: 200px;
}

.popoverTitle {
	display: block;
	margin-bottom: var(--spacing--3xs);
}

.userArea {
	display: flex;
	padding: var(--spacing--xs);
	align-items: center;
	border-top: var(--border-width) var(--border-style) var(--color--foreground);

	.userName {
		display: none;
		overflow: hidden;
		width: 100px;
		white-space: nowrap;
		text-overflow: ellipsis;

		&.expanded {
			display: initial;
		}

		span {
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	.userActions {
		display: none;

		&.expanded {
			display: initial;
		}
	}
}

.userAreaInner {
	display: flex;
	align-items: center;
	width: 100%;
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
