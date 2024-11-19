<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, nextTick, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBecomeTemplateCreatorStore } from '@/components/BecomeTemplateCreatorCta/becomeTemplateCreatorStore';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useRootStore } from '@/stores/root.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useVersionsStore } from '@/stores/versions.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

import { hasPermission } from '@/utils/rbac/permissions';
import { useDebounce } from '@/composables/useDebounce';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useUserHelpers } from '@/composables/useUserHelpers';

import { ABOUT_MODAL_KEY, VERSIONS_MODAL_KEY, VIEWS } from '@/constants';
import { useBugReporting } from '@/composables/useBugReporting';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

import { useGlobalEntityCreation } from '@/composables/useGlobalEntityCreation';
import { N8nNavigationDropdown } from 'n8n-design-system';
import { onClickOutside, type VueInstance } from '@vueuse/core';

const becomeTemplateCreatorStore = useBecomeTemplateCreatorStore();
const cloudPlanStore = useCloudPlanStore();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const templatesStore = useTemplatesStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const versionsStore = useVersionsStore();
const workflowsStore = useWorkflowsStore();

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

const mainMenuItems = computed(() => [
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
					href: 'https://www.youtube.com/watch?v=1MwSoB0gnM4',
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
]);
const createBtn = ref<InstanceType<typeof N8nNavigationDropdown>>();

const isCollapsed = computed(() => uiStore.sidebarMenuCollapsed);

const logoPath = computed(
	() => basePath.value + (isCollapsed.value ? 'static/logo/collapsed.svg' : uiStore.logo),
);

const hasVersionUpdates = computed(
	() => settingsStore.settings.releaseChannel === 'stable' && versionsStore.hasVersionUpdates,
);

const nextVersions = computed(() => versionsStore.nextVersions);
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

	await nextTick(() => {
		uiStore.sidebarMenuCollapsed = window.innerWidth < 900;
		fullyExpanded.value = !isCollapsed.value;
	});

	becomeTemplateCreatorStore.startMonitoringCta();
});

onBeforeUnmount(() => {
	becomeTemplateCreatorStore.stopMonitoringCta();
	window.removeEventListener('resize', onResize);
});

const trackTemplatesClick = () => {
	telemetry.track('User clicked on templates', {
		role: usersStore.currentUserCloudInfo?.role,
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
			void router.push({ name: VIEWS.PERSONAL_SETTINGS });
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

const openUpdatesPanel = () => {
	uiStore.openModal(VERSIONS_MODAL_KEY);
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
		default:
			break;
	}
};

const onResize = (event: UIEvent) => {
	void callDebounced(onResizeEnd, { debounceTime: 100 }, event);
};

const onResizeEnd = async (event: UIEvent) => {
	const browserWidth = (event.target as Window).outerWidth;
	await checkWidthAndAdjustSidebar(browserWidth);
};

const checkWidthAndAdjustSidebar = async (width: number) => {
	if (width < 900) {
		uiStore.sidebarMenuCollapsed = true;
		await nextTick();
		fullyExpanded.value = !isCollapsed.value;
	}
};

const { menu, handleSelect: handleMenuSelect } = useGlobalEntityCreation();
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
			<n8n-icon v-if="isCollapsed" icon="chevron-right" size="xsmall" class="ml-5xs" />
			<n8n-icon v-else icon="chevron-left" size="xsmall" class="mr-5xs" />
		</div>
		<div :class="$style.logo">
			<img :src="logoPath" data-test-id="n8n-logo" :class="$style.icon" alt="n8n" />
			<N8nNavigationDropdown
				ref="createBtn"
				data-test-id="universal-add"
				:menu="menu"
				@select="handleMenuSelect"
			>
				<N8nIconButton icon="plus" type="secondary" outline />
			</N8nNavigationDropdown>
		</div>
		<n8n-menu :items="mainMenuItems" :collapsed="isCollapsed" @select="handleSelect">
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
					<div
						v-if="hasVersionUpdates"
						data-test-id="version-updates-panel-button"
						:class="$style.updates"
						@click="openUpdatesPanel"
					>
						<div :class="$style.giftContainer">
							<GiftNotificationIcon />
						</div>
						<n8n-text
							:class="{ ['ml-xs']: true, [$style.expanded]: fullyExpanded }"
							color="text-base"
						>
							{{ nextVersions.length > 99 ? '99+' : nextVersions.length }} update{{
								nextVersions.length > 1 ? 's' : ''
							}}
						</n8n-text>
					</div>
					<MainSidebarSourceControl :is-collapsed="isCollapsed" />
				</div>
			</template>
			<template v-if="showUserArea" #footer>
				<div ref="user" :class="$style.userArea">
					<div class="ml-3xs" data-test-id="main-sidebar-user-menu">
						<!-- This dropdown is only enabled when sidebar is collapsed -->
						<el-dropdown placement="right-end" trigger="click" @command="onUserActionToggle">
							<div :class="{ [$style.avatar]: true, ['clickable']: isCollapsed }">
								<n8n-avatar
									:first-name="usersStore.currentUser?.firstName"
									:last-name="usersStore.currentUser?.lastName"
									size="small"
								/>
							</div>
							<template v-if="isCollapsed" #dropdown>
								<el-dropdown-menu>
									<el-dropdown-item command="settings">
										{{ i18n.baseText('settings') }}
									</el-dropdown-item>
									<el-dropdown-item command="logout">
										{{ i18n.baseText('auth.signout') }}
									</el-dropdown-item>
								</el-dropdown-menu>
							</template>
						</el-dropdown>
					</div>
					<div
						:class="{ ['ml-2xs']: true, [$style.userName]: true, [$style.expanded]: fullyExpanded }"
					>
						<n8n-text size="small" :bold="true" color="text-dark">{{
							usersStore.currentUser?.fullName
						}}</n8n-text>
					</div>
					<div :class="{ [$style.userActions]: true, [$style.expanded]: fullyExpanded }">
						<n8n-action-dropdown
							:items="userMenuItems"
							placement="top-start"
							data-test-id="user-menu"
							@select="onUserActionToggle"
						/>
					</div>
				</div>
			</template>
		</n8n-menu>
	</div>
</template>

<style lang="scss" module>
.sideMenu {
	position: relative;
	height: 100%;
	border-right: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	transition: width 150ms ease-in-out;
	width: $sidebar-expanded-width;
	padding-top: 54px;
	background-color: var(--menu-background, var(--color-background-xlight));

	.logo {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
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
		padding-top: 90px;

		.logo {
			flex-direction: column;
			gap: 16px;
		}

		.logo img {
			left: 0;
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
</style>
