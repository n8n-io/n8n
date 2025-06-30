<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, nextTick, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { onClickOutside, type VueInstance } from '@vueuse/core';

import { useI18n } from '@n8n/i18n';
import { N8nNavigationDropdown, N8nTooltip, N8nLink, N8nIconButton } from '@n8n/design-system';
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
import { useGlobalEntityCreation } from '@/composables/useGlobalEntityCreation';
import { useBecomeTemplateCreatorStore } from '@/components/BecomeTemplateCreatorCta/becomeTemplateCreatorStore';
import Logo from '@/components/Logo/Logo.vue';
import VersionUpdateCTA from '@/components/VersionUpdateCTA.vue';

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

const { callDebounced } = useDebounce();
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
		icon: 'box-open',
		label: i18n.baseText('mainSidebar.templates'),
		position: 'bottom',
		available: settingsStore.isTemplatesEnabled && templatesStore.hasCustomTemplatesHost,
		route: { to: { name: VIEWS.TEMPLATES } },
	},
	{
		// Link to website templates, available if custom templates are not enabled
		id: 'templates',
		icon: 'box-open',
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
		customIconSize: 'medium',
		position: 'bottom',
		route: { to: { name: VIEWS.VARIABLES } },
	},
	{
		id: 'insights',
		icon: 'chart-bar',
		label: 'Insights',
		customIconSize: 'medium',
		position: 'bottom',
		route: { to: { name: VIEWS.INSIGHTS } },
		available:
			settingsStore.settings.activeModules.includes('insights') &&
			hasPermission(['rbac'], { rbac: { scope: 'insights:list' } }),
	},
	{
		id: 'help',
		icon: 'question',
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
				icon: 'external-link-alt',
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

const trackTemplatesClick = () => {
	telemetry.track('User clicked on templates', {
		role: cloudPlanStore.currentUserCloudInfo?.role,
		active_workflow_count: workflowsStore.activeWorkflows.length,
	});
};

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
			if (settingsStore.isTemplatesEnabled && !templatesStore.hasCustomTemplatesHost) {
				trackTemplatesClick();
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
	if (window.outerWidth < 900) {
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
			<Logo
				location="sidebar"
				:collapsed="isCollapsed"
				:release-channel="settingsStore.settings.releaseChannel"
			>
				<N8nTooltip
					v-if="sourceControlStore.preferences.branchReadOnly && !isCollapsed"
					placement="bottom"
				>
					<template #content>
						<i18n-t keypath="readOnlyEnv.tooltip">
							<template #link>
								<N8nLink
									to="https://docs.n8n.io/source-control-environments/setup/#step-4-connect-n8n-and-configure-your-instance"
									size="small"
								>
									{{ i18n.baseText('readOnlyEnv.tooltip.link') }}
								</N8nLink>
							</template>
						</i18n-t>
					</template>
					<N8nIcon
						data-test-id="read-only-env-icon"
						icon="lock"
						size="xsmall"
						:class="$style.readOnlyEnvironmentIcon"
					/>
				</N8nTooltip>
			</Logo>
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
		<N8nMenu :items="mainMenuItems" :collapsed="isCollapsed" @select="handleSelect">
			<template #header>
				<ProjectNavigation
					:collapsed="isCollapsed"
					:plan-name="cloudPlanStore.currentPlanData?.displayName"
				/>
			</template>

			<template #beforeLowerMenu>
				<BecomeTemplateCreatorCta v-if="fullyExpanded && !userIsTrialing" />
			</template>
			<template #menuSuffix>
				<div>
					<MainSidebarSourceControl :is-collapsed="isCollapsed" />
				</div>
			</template>
			<template v-if="showUserArea" #footer>
				<div ref="user" :class="$style.userArea">
					<div class="ml-3xs" data-test-id="main-sidebar-user-menu">
						<!-- This dropdown is only enabled when sidebar is collapsed -->
						<ElDropdown placement="right-end" trigger="click" @command="onUserActionToggle">
							<div :class="{ [$style.avatar]: true, ['clickable']: isCollapsed }">
								<N8nAvatar
									:first-name="usersStore.currentUser?.firstName"
									:last-name="usersStore.currentUser?.lastName"
									size="small"
								/>
							</div>
							<template v-if="isCollapsed" #dropdown>
								<ElDropdownMenu>
									<ElDropdownItem command="settings">
										{{ i18n.baseText('settings') }}
									</ElDropdownItem>
									<ElDropdownItem command="logout">
										{{ i18n.baseText('auth.signout') }}
									</ElDropdownItem>
								</ElDropdownMenu>
							</template>
						</ElDropdown>
					</div>
					<div
						:class="{ ['ml-2xs']: true, [$style.userName]: true, [$style.expanded]: fullyExpanded }"
					>
						<N8nText size="small" :bold="true" color="text-dark">{{
							usersStore.currentUser?.fullName
						}}</N8nText>
					</div>
					<div :class="{ [$style.userActions]: true, [$style.expanded]: fullyExpanded }">
						<N8nActionDropdown
							:items="userMenuItems"
							placement="top-start"
							data-test-id="user-menu"
							@select="onUserActionToggle"
						/>
					</div>
				</div>
			</template>
		</N8nMenu>
	</div>
</template>

<style lang="scss" module>
.sideMenu {
	display: grid;
	position: relative;
	height: 100%;
	grid-template-rows: auto 1fr auto;
	border-right: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	transition: width 150ms ease-in-out;
	width: $sidebar-expanded-width;
	background-color: var(--menu-background, var(--color-background-xlight));

	.logo {
		display: flex;
		align-items: center;
		padding: var(--spacing-xs);
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

.sideMenuCollapseButton {
	position: absolute;
	right: -10px;
	top: 50%;
	z-index: 999;
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--color-text-base);
	background-color: var(--color-foreground-xlight);
	width: 20px;
	height: 20px;
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-radius: 50%;

	&:hover {
		color: var(--color-primary-shade-1);
	}
}

.updates {
	display: flex;
	align-items: center;
	cursor: pointer;
	padding: var(--spacing-2xs) var(--spacing-l);
	margin: var(--spacing-2xs) 0 0;

	svg {
		color: var(--color-text-base) !important;
	}
	span {
		display: none;
		&.expanded {
			display: initial;
		}
	}

	&:hover {
		&,
		& svg {
			color: var(--color-text-dark) !important;
		}
	}
}

.userArea {
	display: flex;
	padding: var(--spacing-xs);
	align-items: center;
	height: 60px;
	border-top: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);

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

@media screen and (max-height: 470px) {
	:global(#help) {
		display: none;
	}
}

.readOnlyEnvironmentIcon {
	display: inline-block;
	color: white;
	background-color: var(--color-warning);
	align-self: center;
	padding: 2px;
	border-radius: var(--border-radius-small);
	margin: 7px 12px 0 5px;
}
</style>
