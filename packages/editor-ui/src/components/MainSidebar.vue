<template>
	<div id="side-menu" :class="['side-menu', $style.sideMenu]">
		<div :class="$style.sideMenuWrapper">
			<div
				id="collapse-change-button"
				:class="['clickable', $style.sideMenuCollapseButton]"
				@click="toggleCollapse"
			>
				<font-awesome-icon v-if="isCollapsed" icon="angle-right" :class="$style.iconCollapsed" />
				<font-awesome-icon v-else icon="angle-left" :class="$style.iconExpanded" />
			</div>
			<n8n-menu default-active="workflows" @select="handleSelect" :collapse="isCollapsed">
				<div :class="$style.sideMenuFlexContainer">
					<div :class="$style.sideMenuUpper">
						<n8n-menu-item
							index="logo"
							:class="{[$style.logoItem]: true, [$style.logoItemCollapsed]: isCollapsed}"
						>
							<a href="https://n8n.io" target="_blank" :class="$style['logo-link']">
								<img v-if="isCollapsed" :src="basePath + 'n8n-logo-collapsed.svg'" :class="$style['icon']" alt="n8n"/>
								<img v-else :src="basePath + 'n8n-logo-expanded.svg'" :class="$style['icon']" alt="n8n"/>
							</a>
						</n8n-menu-item>

						<MenuItemsIterator :items="sidebarMenuTopItems" :root="true"/>

						<n8n-menu-item v-if="isTemplatesEnabled" index="workflows">
							<font-awesome-icon icon="network-wired"/>&nbsp;
							<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.workflows') }}</span>
						</n8n-menu-item>

						<n8n-menu-item v-if="isTemplatesEnabled" index="templates">
							<font-awesome-icon icon="box-open"/>&nbsp;
							<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.templates') }}</span>
						</n8n-menu-item>

						<el-submenu index="credentials" :title="$locale.baseText('mainSidebar.credentials')" popperClass="sidebar-popper">
							<template slot="title">
								<font-awesome-icon icon="key"/>&nbsp;
								<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.credentials') }}</span>
							</template>

							<n8n-menu-item index="credentials-new">
								<template slot="title">
									<font-awesome-icon icon="file"/>
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.new') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item index="credentials-open">
								<template slot="title">
									<font-awesome-icon icon="folder-open"/>
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.open') }}</span>
								</template>
							</n8n-menu-item>
						</el-submenu>

						<n8n-menu-item index="executions">
							<font-awesome-icon icon="tasks"/>&nbsp;
							<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.executions') }}</span>
						</n8n-menu-item>
					</div>
					<div :class="$style.sideMenuLower">
						<n8n-menu-item index="settings" v-if="canUserAccessSettings && currentUser">
							<font-awesome-icon icon="cog"/>&nbsp;
							<span slot="title" class="item-title-root">{{ $locale.baseText('settings') }}</span>
						</n8n-menu-item>

						<el-submenu index="help" :class="$style.helpMenu" title="Help" popperClass="sidebar-popper">
							<template slot="title">
								<font-awesome-icon icon="question"/>&nbsp;
								<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.help') }}</span>
							</template>

							<MenuItemsIterator :items="helpMenuItems" :afterItemClick="trackHelpItemClick" />

							<n8n-menu-item index="help-about">
								<template slot="title">
									<font-awesome-icon :class="$style['about-icon']" icon="info"/>
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.aboutN8n') }}</span>
								</template>
							</n8n-menu-item>
						</el-submenu>

						<MenuItemsIterator :items="sidebarMenuBottomItems" :root="true"/>

						<div :class="{
							[$style.footerMenuItems] : true,
							[$style.loggedIn]: showUserArea,
						}">
							<n8n-menu-item index="updates" :class="$style.updatesSubmenu" v-if="hasVersionUpdates" @click="openUpdatesPanel">
								<div :class="$style.giftContainer">
									<GiftNotificationIcon />
								</div>
								<span slot="title" :class="['item-title-root', $style.updatesLabel]">
									{{nextVersions.length > 99 ? '99+' : nextVersions.length}} update{{nextVersions.length > 1 ? 's' : ''}} available
								</span>
							</n8n-menu-item>
							<div ref="user" v-if="showUserArea">
								<n8n-menu-item :class="$style.userSubmenu">
									<!-- This dropdown is only enabled when sidebar is collapsed -->
									<el-dropdown :disabled="!isCollapsed" placement="right-end" trigger="click" @command="onUserActionToggle">
										<div :class="{[$style.avatar]: true, ['clickable']: isCollapsed }">
											<n8n-avatar :firstName="currentUser.firstName" :lastName="currentUser.lastName" size="small" />
											<el-dropdown-menu slot="dropdown">
												<el-dropdown-item command="settings">{{ $locale.baseText('settings') }}</el-dropdown-item>
												<el-dropdown-item command="logout">{{ $locale.baseText('auth.signout') }}</el-dropdown-item>
											</el-dropdown-menu>
										</div>
									</el-dropdown>
									<div slot="title" :class="['item-title-root', $style.username ]" v-if="!isCollapsed">
										<span :title="currentUser.fullName">{{currentUser.fullName}}</span>
										<div :class="{[$style.userActions]: true, ['user-actions']: true }">
											<action-drop-down :items="userMenuItems" placement="top-start" @select="onUserActionToggle" />
										</div>
									</div>
								</n8n-menu-item>
							</div>
						</div>
					</div>
				</div>
			</n8n-menu>
		</div>
	</div>

</template>

<script lang="ts">
import {
	IExecutionResponse,
	IWorkflowDataUpdate,
	IMenuItem,
} from '../Interface';

import ExecutionsList from '@/components/ExecutionsList.vue';
import GiftNotificationIcon from './GiftNotificationIcon.vue';
import WorkflowSettings from '@/components/WorkflowSettings.vue';
import ActionDropDown from '@/components/ActionDropdown.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';
import { titleChange } from '@/components/mixins/titleChange';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { workflowRun } from '@/components/mixins/workflowRun';

import mixins from 'vue-typed-mixins';
import { mapGetters } from 'vuex';
import MenuItemsIterator from './MenuItemsIterator.vue';
import {
	ABOUT_MODAL_KEY,
	CREDENTIAL_LIST_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
	TAGS_MANAGER_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	EXECUTIONS_MODAL_KEY,
	VIEWS,
} from '@/constants';
import { userHelpers } from './mixins/userHelpers';

export default mixins(
	genericHelpers,
	restApi,
	showMessage,
	titleChange,
	workflowHelpers,
	workflowRun,
	userHelpers,
)
	.extend({
		name: 'MainSidebar',
		components: {
			ActionDropDown,
			ExecutionsList,
			GiftNotificationIcon,
			WorkflowSettings,
			MenuItemsIterator,
		},
		data () {
			return {
				// @ts-ignore
				basePath: this.$store.getters.getBaseUrl,
				stopExecutionInProgress: false,
				userMenuItems: [
					{
						id: 'settings',
						label: this.$locale.baseText('settings'),
					},
					{
						id: 'logout',
						label: this.$locale.baseText('auth.signout'),
					},
				],
			};
		},
		computed: {
			...mapGetters('ui', {
				isCollapsed: 'sidebarMenuCollapsed',
			}),
			...mapGetters('versions', [
				'hasVersionUpdates',
				'nextVersions',
			]),
			...mapGetters('users', [
				'canUserAccessSidebarUserInfo',
				'currentUser',
			]),
			...mapGetters('settings', [
				'isTemplatesEnabled',
				'isUserManagementEnabled',
			]),
			canUserAccessSettings(): boolean {
				const accessibleRoute = this.findFirstAccessibleSettingsRoute();
				return accessibleRoute !== null;
			},
			showUserArea(): boolean {
				return this.isUserManagementEnabled && this.canUserAccessSidebarUserInfo && this.currentUser;
			},
			helpMenuItems (): object[] {
				return [
					{
						id: 'quickstart',
						type: 'link',
						properties: {
							href: 'https://www.youtube.com/watch?v=RpjQTGKm-ok',
							title: this.$locale.baseText('mainSidebar.helpMenuItems.quickstart'),
							icon: 'video',
							newWindow: true,
						},
					},
					{
						id: 'docs',
						type: 'link',
						properties: {
							href: 'https://docs.n8n.io',
							title: this.$locale.baseText('mainSidebar.helpMenuItems.documentation'),
							icon: 'book',
							newWindow: true,
						},
					},
					{
						id: 'forum',
						type: 'link',
						properties: {
							href: 'https://community.n8n.io',
							title: this.$locale.baseText('mainSidebar.helpMenuItems.forum'),
							icon: 'users',
							newWindow: true,
						},
					},
					{
						id: 'examples',
						type: 'link',
						properties: {
							href: 'https://docs.n8n.io/courses',
							title: this.$locale.baseText('mainSidebar.helpMenuItems.course'),
							icon: 'graduation-cap',
							newWindow: true,
						},
					},
				];
			},
			exeuctionId (): string | undefined {
				return this.$route.params.id;
			},
			executionFinished (): boolean {
				if (!this.isExecutionPage) {
					// We are not on an execution page so return false
					return false;
				}

				const fullExecution = this.$store.getters.getWorkflowExecution;

				if (fullExecution === null) {
					// No execution loaded so return also false
					return false;
				}

				if (fullExecution.finished === true) {
					return true;
				}

				return false;
			},
			executionWaitingForWebhook (): boolean {
				return this.$store.getters.executionWaitingForWebhook;
			},
			isExecutionPage (): boolean {
				return this.$route.name === VIEWS.EXECUTION;
			},
			isWorkflowActive (): boolean {
				return this.$store.getters.isActive;
			},
			currentWorkflow (): string {
				return this.$route.params.name;
			},
			workflowExecution (): IExecutionResponse | null {
				return this.$store.getters.getWorkflowExecution;
			},
			workflowName (): string {
				return this.$store.getters.workflowName;
			},
			workflowRunning (): boolean {
				return this.$store.getters.isActionActive('workflowRunning');
			},
			sidebarMenuTopItems(): IMenuItem[] {
				return this.$store.getters.sidebarMenuItems.filter((item: IMenuItem) => item.position === 'top');
			},
			sidebarMenuBottomItems(): IMenuItem[] {
				return this.$store.getters.sidebarMenuItems.filter((item: IMenuItem) => item.position === 'bottom');
			},
			onWorkflowPage(): boolean {
				return this.$route.meta && this.$route.meta.nodeView;
			},
		},
		mounted() {
			if (this.$refs.user) {
				this.$externalHooks().run('mainSidebar.mounted', { userRef: this.$refs.user });
			}
			this.checkWidthAndAdjustSidebar(window.outerWidth);
		},
		created() {
			window.addEventListener("resize", this.onResize);
		},
		destroyed() {
			window.removeEventListener("resize", this.onResize);
		},
		methods: {
			trackHelpItemClick (itemType: string) {
				this.$telemetry.track('User clicked help resource', { type: itemType, workflow_id: this.$store.getters.workflowId });
			},
			async onUserActionToggle(action: string) {
				switch (action) {
					case 'logout':
						this.onLogout();
						break;
					case 'settings':
						this.$router.push({name: VIEWS.PERSONAL_SETTINGS});
						break;
					default:
						break;
				}
			},
			async onLogout() {
				try {
					await this.$store.dispatch('users/logout');

					const route = this.$router.resolve({ name: VIEWS.SIGNIN });
					window.open(route.href, '_self');
				} catch (e) {
					this.$showError(e, this.$locale.baseText('auth.signout.error'));
				}
			},
			toggleCollapse () {
				this.$store.commit('ui/toggleSidebarMenuCollapse');
			},
			clearExecutionData () {
				this.$store.commit('setWorkflowExecutionData', null);
				this.updateNodesExecutionIssues();
			},
			openTagManager() {
				this.$store.dispatch('ui/openModal', TAGS_MANAGER_MODAL_KEY);
			},
			openUpdatesPanel() {
				this.$store.dispatch('ui/openModal', VERSIONS_MODAL_KEY);
			},
			async stopExecution () {
				const executionId = this.$store.getters.activeExecutionId;
				if (executionId === null) {
					return;
				}

				try {
					this.stopExecutionInProgress = true;
					await this.restApi().stopCurrentExecution(executionId);
					this.$showMessage({
						title: this.$locale.baseText('mainSidebar.showMessage.stopExecution.title'),
						type: 'success',
					});
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('mainSidebar.showError.stopExecution.title'),
					);
				}
				this.stopExecutionInProgress = false;
			},
			async openWorkflow (workflowId: string) {
				// Change to other workflow
				this.$router.push({
					name: VIEWS.WORKFLOW,
					params: { name: workflowId },
				});

				this.$store.commit('ui/closeAllModals');
			},
			async handleSelect (key: string, keyPath: string) {
				if (key === 'workflows') {
					// TODO: Update once workflows view is implemented
					this.$router.push({name: VIEWS.NEW_WORKFLOW}).catch(()=>{});
				} else if (key === 'help-about') {
					this.trackHelpItemClick('about');
					this.$store.dispatch('ui/openModal', ABOUT_MODAL_KEY);
				} else if (key === 'user') {
					this.$router.push({name: VIEWS.PERSONAL_SETTINGS});
				} else if (key === 'templates' || key === 'template-new') {
					if (this.$router.currentRoute.name !== VIEWS.TEMPLATES) {
						this.$router.push({ name: VIEWS.TEMPLATES });
					}
				} else if (key === 'credentials-open') {
					this.$store.dispatch('ui/openModal', CREDENTIAL_LIST_MODAL_KEY);
				} else if (key === 'credentials-new') {
					this.$store.dispatch('ui/openModal', CREDENTIAL_SELECT_MODAL_KEY);
				} else if (key === 'execution-open-workflow') {
					if (this.workflowExecution !== null) {
						this.openWorkflow(this.workflowExecution.workflowId as string);
					}
				} else if (key === 'executions') {
					this.$store.dispatch('ui/openModal', EXECUTIONS_MODAL_KEY);
				} else if (key === 'settings') {
					const defaultRoute = this.findFirstAccessibleSettingsRoute();
					if (defaultRoute) {
						const routeProps = this.$router.resolve({ name: defaultRoute });
						this.$router.push(routeProps.route.path);
					}
				}
			},
			findFirstAccessibleSettingsRoute() {
				// Get all settings rotes by filtering them by pageCategory property
				const settingsRoutes = this.$router.getRoutes().filter(
					category => category.meta.telemetry &&
						category.meta.telemetry.pageCategory === 'settings',
				).map(route => route.name || '');
				let defaultSettingsRoute = null;

				for (const route of settingsRoutes) {
					if (this.canUserAccessRouteByName(route)) {
						defaultSettingsRoute = route;
						break;
					}
				}
				return defaultSettingsRoute;
			},
			onResize (event: UIEvent) {
				this.callDebounced("onResizeEnd", { debounceTime: 100 }, event);
			},
			onResizeEnd (event: UIEvent) {
				const browserWidth = (event.target as Window).outerWidth;
				this.checkWidthAndAdjustSidebar(browserWidth);
			},
			checkWidthAndAdjustSidebar (width: number) {
				if (width < 900) {
					this.$store.commit('ui/collapseSidebarMenu');
				}
			},
		},
	});
</script>

<style lang="scss" module>

$--n8n-logo-text-color: #101330;

.sideMenu {
	height: 100%;
}

.sideMenuWrapper {
	height: 100%;
	position: relative;
	ul { height: 100%; }
}

.sideMenuCollapseButton {
	position: absolute;
	right: -10px;
	top: 50%;
	z-index: 999;
	color: var(--color-text-base);
	background-color: var(--color-foreground-xlight);
	width: 20px;
	height: 20px;
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	text-align: center;
	border-radius: 50%;

	svg {
		position: relative;
		top: .5px;
	}

	.iconCollapsed { left: .5px; }
	.iconExpanded { left: -.5px; }

	&:hover {
		color: var(--color-primary-shade-1);
	}
}

.sideMenuFlexContainer {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	height: 100%;
	padding: 0 var(--spacing-2xs);
}

.logoItem {
	display: flex;
	justify-content: space-between;
	height: $--header-height;
	line-height: $--header-height;
	&:hover { background-color: initial; }

	* { vertical-align: middle; }
	.icon { height: 18px; }

	.logoText {
		position: relative;
		left: 5px;
		font-weight: bold;
		color: $--n8n-logo-text-color;
		text-decoration: none;
	}
}

.logoItemCollapsed {
	border-bottom: var(--border-base);

	.logoText { display: none; }
}

.footerMenuItems {
	display: flex;
	flex-grow: 1;
	flex-direction: column;
	justify-content: flex-end;
	padding-bottom: 20px;

	&.loggedIn {
		padding-bottom: var(--spacing-m);
	}
}

.aboutIcon {
	margin-left: 5px;
}

.updatesSubmenu {
	color: $--sidebar-inactive-color !important;

	.updatesLabel {
		position: relative !important;
		font-size: var(--font-size-xs);
		top: 0 !important;
		left: -2px !important;
	}

	&:hover {
		color: $--sidebar-active-color;
	}

	.giftContainer {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		height: 100%;
		width: 100%;
	}
}

.userSubmenu {
	position: relative;
	border-top: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
	cursor: default;
	padding: 8px 12px !important;

	&:hover {
		background-color: unset;
	}

	.avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: default;
	}

	.username {
		position: relative !important;
		display: flex !important;
		width: 73%;
		left: 13px !important;
		justify-content: space-between;
		align-items: center;
		color: var(--color-text-base);
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-xs);
		cursor: default;

		span {
			width: 100px;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	.userActions {
		position: relative;
		left: 10px;
		cursor: pointer;

		&:hover {
			color: var(--color-primary);
		}
	}
}

.userActionsMenu {
	margin-left: 25px !important;
}

@media screen and (max-height: 470px) {
	.helpMenu { display: none; }
}
</style>

<style lang="scss">
.sidebar-popper{
	.el-menu-item {
		font-size: 0.9em;
		height: 35px;
		line-height: 35px;
		color: $--custom-dialog-text-color;
		--menu-item-hover-fill: var(--color-foreground-base);

		.item-title {
			position: absolute;
			left: 55px;
		}

		.svg-inline--fa {
			position: relative;
			right: -3px;
		}
	}
}

#side-menu {
	.el-menu {
		--menu-item-active-background-color: var(--color-foreground-base);
		--menu-item-active-font-color: var(--color-text-dark);
		--menu-item-hover-fill: var(--color-foreground-base);
		--menu-item-hover-font-color: var(--color-text-dark);

		.el-icon-arrow-down:hover {
			color: var(--color-primary);
		}

		.el-menu-item, .el-submenu__title {
			margin: 8px 0;
			border-radius: var(--border-radius-base);
			line-height: normal;
			padding: 8px 12px;
			height: auto;
		}

		.svg-inline--fa {
			margin-right: 12px;
		}

	}
	// Menu
	// .el-menu--vertical,
	// .el-menu {
	// 	border: none;
	// 	font-size: 14px;
	// 	--menu-item-hover-fill: var(--color-foreground-base);

	// 	.el-menu--popup,
	// 	.el-menu--inline {
	// 		font-size: 0.9em;
	// 		li.el-menu-item {
	// 			height: 35px;
	// 			line-height: 35px;
	// 			color: $--custom-dialog-text-color;
	// 		}
	// 	}

	// 	.el-menu-item,
	// 	.el-submenu__title {
	// 		display: flex;
	// 		align-items: center;
	// 		color: var(--color-text-dark);
	// 		font-size: 1.2em;
	// 		.el-submenu__icon-arrow {
	// 			color: var(--color-text-dark);
	// 			font-weight: 800;
	// 			font-size: 1em;
	// 		}
	// 		.svg-inline--fa {
	// 			position: relative;
	// 			right: -3px;
	// 		}
	// 		.item-title {
	// 			position: absolute;
	// 			left: 56px;
	// 			font-size: var(--font-size-s);
	// 		}
	// 		.item-title-root {
	// 			position: absolute;
	// 			left: 60px;
	// 			top: 1px;
	// 		}
	// 	}

	// 	.el-menu--inline {
	// 		.el-menu-item {
	// 			padding-left: 30px!important;
	// 		}
	// 	}

	// }

	// .el-menu-item {
	// 	min-width: 200px;
	// 	a {
	// 		color: var(--color-text-base);

	// 		&.primary-item {
	// 			color: $--color-primary;
	// 			vertical-align: baseline;
	// 		}
	// 	}
	// }
}

.el-menu--collapse .el-submenu .el-submenu__title span,
.el-menu--collapse .el-submenu__icon-arrow {
  height: 0;
  width: 0;
  overflow: hidden;
  visibility: hidden;
  display: inline-block;
}


.el-menu--collapse .el-menu-item {
	min-width: auto !important;
}
</style>
