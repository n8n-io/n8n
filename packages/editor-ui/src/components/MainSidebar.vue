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
		<n8n-menu :items="mainMenuItems" :collapsed="isCollapsed" @select="handleSelect">
			<template #header>
				<div :class="$style.logo">
					<img
						:src="basePath + (isCollapsed ? 'n8n-logo-collapsed.svg' : 'n8n-logo-expanded.svg')"
						:class="$style.icon"
						alt="n8n"
					/>
				</div>
			</template>
			<template #menuSuffix>
				<div v-if="hasVersionUpdates || versionControlStore.state.currentBranch">
					<div v-if="hasVersionUpdates" :class="$style.updates" @click="openUpdatesPanel">
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
					<div :class="$style.sync" v-if="versionControlStore.state.currentBranch">
						<span>
							<n8n-icon icon="code-branch" class="mr-xs" />
							{{ currentBranch }}
						</span>
						<n8n-button
							:title="
								$locale.baseText('settings.versionControl.sync.prompt.title', {
									interpolate: { branch: currentBranch },
								})
							"
							icon="sync"
							type="tertiary"
							:size="isCollapsed ? 'mini' : 'small'"
							square
							@click="sync"
						/>
					</div>
				</div>
			</template>
			<template #footer v-if="showUserArea">
				<div :class="$style.userArea">
					<div class="ml-3xs" data-test-id="main-sidebar-user-menu">
						<!-- This dropdown is only enabled when sidebar is collapsed -->
						<el-dropdown
							:disabled="!isCollapsed"
							placement="right-end"
							trigger="click"
							@command="onUserActionToggle"
						>
							<div :class="{ [$style.avatar]: true, ['clickable']: isCollapsed }">
								<n8n-avatar
									:firstName="usersStore.currentUser.firstName"
									:lastName="usersStore.currentUser.lastName"
									size="small"
								/>
							</div>
							<template #dropdown>
								<el-dropdown-menu>
									<el-dropdown-item command="settings">
										{{ $locale.baseText('settings') }}
									</el-dropdown-item>
									<el-dropdown-item command="logout">
										{{ $locale.baseText('auth.signout') }}
									</el-dropdown-item>
								</el-dropdown-menu>
							</template>
						</el-dropdown>
					</div>
					<div
						:class="{ ['ml-2xs']: true, [$style.userName]: true, [$style.expanded]: fullyExpanded }"
					>
						<n8n-text size="small" :bold="true" color="text-dark">{{
							usersStore.currentUser.fullName
						}}</n8n-text>
					</div>
					<div :class="{ [$style.userActions]: true, [$style.expanded]: fullyExpanded }">
						<n8n-action-dropdown
							:items="userMenuItems"
							placement="top-start"
							@select="onUserActionToggle"
						/>
					</div>
				</div>
			</template>
		</n8n-menu>
	</div>
</template>

<script lang="ts">
import type { IExecutionResponse, IMenuItem, IVersion } from '../Interface';

import GiftNotificationIcon from './GiftNotificationIcon.vue';
import WorkflowSettings from '@/components/WorkflowSettings.vue';

import { genericHelpers } from '@/mixins/genericHelpers';
import { showMessage } from '@/mixins/showMessage';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { workflowRun } from '@/mixins/workflowRun';

import mixins from 'vue-typed-mixins';
import { ABOUT_MODAL_KEY, VERSIONS_MODAL_KEY, VIEWS } from '@/constants';
import { userHelpers } from '@/mixins/userHelpers';
import { debounceHelper } from '@/mixins/debounce';
import Vue from 'vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useUsersStore } from '@/stores/users';
import { useWorkflowsStore } from '@/stores/workflows';
import { useRootStore } from '@/stores/n8nRootStore';
import { useVersionsStore } from '@/stores/versions';
import { isNavigationFailure } from 'vue-router';
import { useVersionControlStore } from '@/stores/versionControl';

export default mixins(
	genericHelpers,
	showMessage,
	workflowHelpers,
	workflowRun,
	userHelpers,
	debounceHelper,
).extend({
	name: 'MainSidebar',
	components: {
		GiftNotificationIcon,
		WorkflowSettings,
	},
	data() {
		return {
			// @ts-ignore
			basePath: '',
			fullyExpanded: false,
		};
	},
	computed: {
		...mapStores(
			useRootStore,
			useSettingsStore,
			useUIStore,
			useUsersStore,
			useVersionsStore,
			useWorkflowsStore,
			useVersionControlStore,
		),
		currentBranch(): string {
			return this.versionControlStore.state.currentBranch;
		},
		hasVersionUpdates(): boolean {
			return this.versionsStore.hasVersionUpdates;
		},
		nextVersions(): IVersion[] {
			return this.versionsStore.nextVersions;
		},
		isCollapsed(): boolean {
			return this.uiStore.sidebarMenuCollapsed;
		},
		canUserAccessSettings(): boolean {
			const accessibleRoute = this.findFirstAccessibleSettingsRoute();
			return accessibleRoute !== null;
		},
		showUserArea(): boolean {
			return (
				this.settingsStore.isUserManagementEnabled &&
				this.usersStore.canUserAccessSidebarUserInfo &&
				this.usersStore.currentUser !== null
			);
		},
		workflowExecution(): IExecutionResponse | null {
			return this.workflowsStore.getWorkflowExecution;
		},
		userMenuItems(): object[] {
			return [
				{
					id: 'settings',
					label: this.$locale.baseText('settings'),
				},
				{
					id: 'logout',
					label: this.$locale.baseText('auth.signout'),
				},
			];
		},
		mainMenuItems(): IMenuItem[] {
			const items: IMenuItem[] = [];
			const injectedItems = this.uiStore.sidebarMenuItems;

			if (injectedItems && injectedItems.length > 0) {
				for (const item of injectedItems) {
					items.push({
						id: item.id,
						// @ts-ignore
						icon: item.properties ? item.properties.icon : '',
						// @ts-ignore
						label: item.properties ? item.properties.title : '',
						position: item.position,
						type: item.properties?.href ? 'link' : 'regular',
						properties: item.properties,
					} as IMenuItem);
				}
			}

			const regularItems: IMenuItem[] = [
				{
					id: 'workflows',
					icon: 'network-wired',
					label: this.$locale.baseText('mainSidebar.workflows'),
					position: 'top',
					activateOnRouteNames: [VIEWS.WORKFLOWS],
				},
				{
					id: 'templates',
					icon: 'box-open',
					label: this.$locale.baseText('mainSidebar.templates'),
					position: 'top',
					available: this.settingsStore.isTemplatesEnabled,
					activateOnRouteNames: [VIEWS.TEMPLATES],
				},
				{
					id: 'credentials',
					icon: 'key',
					label: this.$locale.baseText('mainSidebar.credentials'),
					customIconSize: 'medium',
					position: 'top',
					activateOnRouteNames: [VIEWS.CREDENTIALS],
				},
				{
					id: 'variables',
					icon: 'variable',
					label: this.$locale.baseText('mainSidebar.variables'),
					customIconSize: 'medium',
					position: 'top',
					activateOnRouteNames: [VIEWS.VARIABLES],
				},
				{
					id: 'executions',
					icon: 'tasks',
					label: this.$locale.baseText('mainSidebar.executions'),
					position: 'top',
					activateOnRouteNames: [VIEWS.EXECUTIONS],
				},
				{
					id: 'settings',
					icon: 'cog',
					label: this.$locale.baseText('settings'),
					position: 'bottom',
					available: this.canUserAccessSettings && this.usersStore.currentUser !== null,
					activateOnRouteNames: [VIEWS.USERS_SETTINGS, VIEWS.API_SETTINGS, VIEWS.PERSONAL_SETTINGS],
				},
				{
					id: 'help',
					icon: 'question',
					label: 'Help',
					position: 'bottom',
					children: [
						{
							id: 'quickstart',
							icon: 'video',
							label: this.$locale.baseText('mainSidebar.helpMenuItems.quickstart'),
							type: 'link',
							properties: {
								href: 'https://www.youtube.com/watch?v=1MwSoB0gnM4',
								newWindow: true,
							},
						},
						{
							id: 'docs',
							icon: 'book',
							label: this.$locale.baseText('mainSidebar.helpMenuItems.documentation'),
							type: 'link',
							properties: {
								href: 'https://docs.n8n.io',
								newWindow: true,
							},
						},
						{
							id: 'forum',
							icon: 'users',
							label: this.$locale.baseText('mainSidebar.helpMenuItems.forum'),
							type: 'link',
							properties: {
								href: 'https://community.n8n.io',
								newWindow: true,
							},
						},
						{
							id: 'examples',
							icon: 'graduation-cap',
							label: this.$locale.baseText('mainSidebar.helpMenuItems.course'),
							type: 'link',
							properties: {
								href: 'https://www.youtube.com/watch?v=1MwSoB0gnM4',
								newWindow: true,
							},
						},
						{
							id: 'about',
							icon: 'info',
							label: this.$locale.baseText('mainSidebar.aboutN8n'),
							position: 'bottom',
						},
					],
				},
			];
			return [...items, ...regularItems];
		},
	},
	async mounted() {
		this.basePath = this.rootStore.baseUrl;
		if (this.$refs.user) {
			this.$externalHooks().run('mainSidebar.mounted', { userRef: this.$refs.user });
		}
		if (window.innerWidth < 900 || this.uiStore.isNodeView) {
			this.uiStore.sidebarMenuCollapsed = true;
		} else {
			this.uiStore.sidebarMenuCollapsed = false;
		}
		await Vue.nextTick();
		this.fullyExpanded = !this.isCollapsed;
	},
	created() {
		window.addEventListener('resize', this.onResize);
	},
	destroyed() {
		window.removeEventListener('resize', this.onResize);
	},
	methods: {
		trackHelpItemClick(itemType: string) {
			this.$telemetry.track('User clicked help resource', {
				type: itemType,
				workflow_id: this.workflowsStore.workflowId,
			});
		},
		async onUserActionToggle(action: string) {
			switch (action) {
				case 'logout':
					this.onLogout();
					break;
				case 'settings':
					this.$router.push({ name: VIEWS.PERSONAL_SETTINGS });
					break;
				default:
					break;
			}
		},
		onLogout() {
			this.$router.push({ name: VIEWS.SIGNOUT });
		},
		toggleCollapse() {
			this.uiStore.toggleSidebarMenuCollapse();
			// When expanding, delay showing some element to ensure smooth animation
			if (!this.isCollapsed) {
				setTimeout(() => {
					this.fullyExpanded = !this.isCollapsed;
				}, 300);
			} else {
				this.fullyExpanded = !this.isCollapsed;
			}
		},
		openUpdatesPanel() {
			this.uiStore.openModal(VERSIONS_MODAL_KEY);
		},
		async handleSelect(key: string) {
			switch (key) {
				case 'workflows': {
					if (this.$router.currentRoute.name !== VIEWS.WORKFLOWS) {
						this.goToRoute({ name: VIEWS.WORKFLOWS });
					}
					break;
				}
				case 'templates': {
					if (this.$router.currentRoute.name !== VIEWS.TEMPLATES) {
						this.goToRoute({ name: VIEWS.TEMPLATES });
					}
					break;
				}
				case 'credentials': {
					if (this.$router.currentRoute.name !== VIEWS.CREDENTIALS) {
						this.goToRoute({ name: VIEWS.CREDENTIALS });
					}
					break;
				}
				case 'variables': {
					if (this.$router.currentRoute.name !== VIEWS.VARIABLES) {
						this.goToRoute({ name: VIEWS.VARIABLES });
					}
					break;
				}
				case 'executions': {
					if (this.$router.currentRoute.name !== VIEWS.EXECUTIONS) {
						this.goToRoute({ name: VIEWS.EXECUTIONS });
					}
					break;
				}
				case 'settings': {
					const defaultRoute = this.findFirstAccessibleSettingsRoute();
					if (defaultRoute) {
						const routeProps = this.$router.resolve({ name: defaultRoute });
						if (this.$router.currentRoute.name !== defaultRoute) {
							this.goToRoute(routeProps.route.path);
						}
					}
					break;
				}
				case 'about': {
					this.trackHelpItemClick('about');
					this.uiStore.openModal(ABOUT_MODAL_KEY);
					break;
				}
				case 'quickstart':
				case 'docs':
				case 'forum':
				case 'examples': {
					this.trackHelpItemClick(key);
					break;
				}
				default:
					break;
			}
		},
		goToRoute(route: string | { name: string }) {
			this.$router.push(route).catch((failure) => {
				// Catch navigation failures caused by route guards
				if (!isNavigationFailure(failure)) {
					console.error(failure);
				}
			});
		},
		findFirstAccessibleSettingsRoute() {
			// Get all settings rotes by filtering them by pageCategory property
			const settingsRoutes = this.$router
				.getRoutes()
				.filter(
					(category) =>
						category.meta.telemetry && category.meta.telemetry.pageCategory === 'settings',
				)
				.map((route) => route.name || '');
			let defaultSettingsRoute = null;

			for (const route of settingsRoutes) {
				if (this.canUserAccessRouteByName(route)) {
					defaultSettingsRoute = route;
					break;
				}
			}
			return defaultSettingsRoute;
		},
		onResize(event: UIEvent) {
			this.callDebounced('onResizeEnd', { debounceTime: 100 }, event);
		},
		onResizeEnd(event: UIEvent) {
			const browserWidth = (event.target as Window).outerWidth;
			this.checkWidthAndAdjustSidebar(browserWidth);
		},
		checkWidthAndAdjustSidebar(width: number) {
			if (width < 900) {
				this.uiStore.sidebarMenuCollapsed = true;
				Vue.nextTick(() => {
					this.fullyExpanded = !this.isCollapsed;
				});
			}
		},
		async sync() {
			const prompt = await this.$prompt(
				this.$locale.baseText('settings.versionControl.sync.prompt.description', {
					interpolate: { branch: this.versionControlStore.state.currentBranch },
				}),
				this.$locale.baseText('settings.versionControl.sync.prompt.title', {
					interpolate: { branch: this.versionControlStore.state.currentBranch },
				}),
				{
					confirmButtonText: 'Sync',
					cancelButtonText: 'Cancel',
					inputPlaceholder: this.$locale.baseText(
						'settings.versionControl.sync.prompt.placeholder',
					),
					inputPattern: /^.+$/,
					inputErrorMessage: this.$locale.baseText('settings.versionControl.sync.prompt.error'),
				},
			);

			if (prompt.value) {
				this.versionControlStore.sync({ commitMessage: prompt.value });
			}
		},
	},
});
</script>

<style lang="scss" module>
.sideMenu {
	position: relative;
	height: 100%;
	border-right: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	transition: width 150ms ease-in-out;
	width: $sidebar-expanded-width;
	.logo {
		height: $header-height;
		display: flex;
		align-items: center;
		padding: var(--spacing-xs);

		img {
			position: relative;
			left: 1px;
			height: 20px;
		}
	}

	&.sideMenuCollapsed {
		width: $sidebar-width;

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
	height: 26px;
	cursor: pointer;

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

.sync {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) var(--spacing-l);
	margin: 0 calc(var(--spacing-l) * -1) calc(var(--spacing-m) * -1);
	background: var(--color-background-light);
	border-top: 1px solid var(--color-foreground-light);
	font-size: var(--font-size-2xs);

	span {
		color: var(--color-text-light);
	}

	.sideMenuCollapsed & {
		justify-content: center;
		margin-left: calc(var(--spacing-xl) * -1);
		> span {
			display: none;
		}
	}
}
</style>
