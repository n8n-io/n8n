<template>
	<div id="side-menu" :class="{
		['side-menu']: true,
		[$style.sideMenu]: true,
		[$style.sideMenuCollapsed]: isCollapsed
	}">
		<div :class="{[$style.sideMenuWrapper]: true, [$style.expanded]: !isCollapsed}">
			<div
				id="collapse-change-button"
				:class="{
					['clickable']: true,
					[$style.sideMenuCollapseButton]: true,
					[$style.expandedButton]: !isCollapsed
				}"
				@click="toggleCollapse"
			></div>
			<n8n-menu :default-active="$route.path" @select="handleSelect" :collapse="isCollapsed">
				<n8n-menu-item
					index="logo"
					:class="[$style.logoItem, $style.disableActiveStyle]"
				>
					<img :src="basePath +  (isCollapsed ? 'n8n-logo-collapsed.svg' : 'n8n-logo-expanded.svg')" :class="$style.icon" alt="n8n"/>
				</n8n-menu-item>
				<div :class="$style.sideMenuFlexContainer">
					<div :class="$style.sideMenuUpper">

						<MenuItemsIterator :items="sidebarMenuTopItems" :root="true"/>

						<el-submenu
							index="/workflow"
							title="Workflow"
							popperClass="sidebar-popper"
							:class="{
								[$style.workflowSubmenu]: true,
								[$style.active]: $route.path === '/workflow'
							}"
						>
							<template slot="title">
								<font-awesome-icon icon="network-wired"/>&nbsp;
								<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.workflows') }}</span>
							</template>

							<n8n-menu-item index="/workflow">
								<template slot="title">
									<font-awesome-icon icon="file"/>&nbsp;
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.new') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item index="workflow-open" :class="$style.disableActiveStyle">
								<template slot="title">
									<font-awesome-icon icon="folder-open"/>&nbsp;
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.open') }}</span>
								</template>
							</n8n-menu-item>
						</el-submenu>

						<n8n-menu-item v-if="isTemplatesEnabled" index="/templates" :class="$style.templatesSubmenu">
							<font-awesome-icon icon="box-open"/>&nbsp;
							<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.templates') }}</span>
						</n8n-menu-item>

						<n8n-menu-item index="/credentials" :class="$style.credentialsSubmenu">
							<font-awesome-icon icon="key"/>
							<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.credentials') }}</span>
						</n8n-menu-item>

						<n8n-menu-item index="executions"  :class="[$style.disableActiveStyle, $style.executionsSubmenu]">
							<font-awesome-icon icon="tasks"/>&nbsp;
							<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.executions') }}</span>
						</n8n-menu-item>
					</div>
					<div :class="$style.sideMenuLower">
						<n8n-menu-item index="settings" v-if="canUserAccessSettings && currentUser" :class="$style.settingsSubmenu">
							<font-awesome-icon icon="cog"/>&nbsp;
							<span slot="title" class="item-title-root">{{ $locale.baseText('settings') }}</span>
						</n8n-menu-item>

						<el-submenu index="help" :class="[$style.helpMenu, $style.disableActiveStyle]" title="Help" popperClass="sidebar-popper">
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
									{{nextVersions.length > 99 ? '99+' : nextVersions.length}} update{{nextVersions.length > 1 ? 's' : ''}}
								</span>
							</n8n-menu-item>
							<n8n-menu-item v-if="showUserArea" :class="$style.userSubmenu" index="">
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
									<span :title="currentUser.fullName" :class="$style.fullName">{{currentUser.fullName}}</span>
									<div :class="{[$style.userActions]: true, ['user-actions']: true }">
										<n8n-action-dropdown :items="userMenuItems" placement="top-start" @select="onUserActionToggle" />
									</div>
								</div>
							</n8n-menu-item>
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
	IMenuItem,
} from '../Interface';

import ExecutionsList from '@/components/ExecutionsList.vue';
import GiftNotificationIcon from './GiftNotificationIcon.vue';
import WorkflowSettings from '@/components/WorkflowSettings.vue';

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
	MODAL_CANCEL,
	MODAL_CLOSE,
	MODAL_CONFIRMED,
	ABOUT_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	EXECUTIONS_MODAL_KEY,
	VIEWS,
	WORKFLOW_OPEN_MODAL_KEY,
} from '@/constants';
import { userHelpers } from './mixins/userHelpers';
import { debounceHelper } from './mixins/debounce';

export default mixins(
	genericHelpers,
	restApi,
	showMessage,
	titleChange,
	workflowHelpers,
	workflowRun,
	userHelpers,
	debounceHelper,
)
	.extend({
		name: 'MainSidebar',
		components: {
			ExecutionsList,
			GiftNotificationIcon,
			WorkflowSettings,
			MenuItemsIterator,
		},
		data () {
			return {
				// @ts-ignore
				basePath: this.$store.getters.getBaseUrl,
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
				isNodeView: 'isNodeView',
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
			workflowExecution (): IExecutionResponse | null {
				return this.$store.getters.getWorkflowExecution;
			},
			sidebarMenuTopItems(): IMenuItem[] {
				return this.$store.getters.sidebarMenuItems.filter((item: IMenuItem) => item.position === 'top');
			},
			sidebarMenuBottomItems(): IMenuItem[] {
				return this.$store.getters.sidebarMenuItems.filter((item: IMenuItem) => item.position === 'bottom');
			},
		},
		mounted() {
			if (this.$refs.user) {
				this.$externalHooks().run('mainSidebar.mounted', { userRef: this.$refs.user });
			}
			if (window.innerWidth > 900 && !this.isNodeView) {
				this.$store.commit('ui/expandSidebarMenu');
			}
			this.checkWidthAndAdjustSidebar(window.innerWidth);
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
			openUpdatesPanel() {
				this.$store.dispatch('ui/openModal', VERSIONS_MODAL_KEY);
			},
			async handleSelect (key: string) {
				switch (key) {
					case '/workflow': {
						await this.createNewWorkflow();
						break;
					}
					case 'workflow-open': {
						this.$store.dispatch('ui/openModal', WORKFLOW_OPEN_MODAL_KEY);
						break;
					}
					case '/templates': {
						if (this.$router.currentRoute.name !== VIEWS.TEMPLATES) {
							this.$router.push({ name: VIEWS.TEMPLATES });
						}
						break;
					}
					case '/credentials': {
						this.$router.push({name: VIEWS.CREDENTIALS});
						break;
					}
					case 'executions': {
						this.$store.dispatch('ui/openModal', EXECUTIONS_MODAL_KEY);
						break;
					}
					case 'settings': {
						const defaultRoute = this.findFirstAccessibleSettingsRoute();
						if (defaultRoute) {
							const routeProps = this.$router.resolve({ name: defaultRoute });
							this.$router.push(routeProps.route.path);
						}
						break;
					}
					case 'help-about': {
						this.trackHelpItemClick('about');
						this.$store.dispatch('ui/openModal', ABOUT_MODAL_KEY);
						break;
					}
					default: break;
				}
			},
			async createNewWorkflow (): Promise<void> {
				const result = this.$store.getters.getStateIsDirty;
				if(result) {
					const confirmModal = await this.confirmModal(
						this.$locale.baseText('generic.unsavedWork.confirmMessage.message'),
						this.$locale.baseText('generic.unsavedWork.confirmMessage.headline'),
						'warning',
						this.$locale.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
						this.$locale.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
						true,
					);
					if (confirmModal === MODAL_CONFIRMED) {
						const saved = await this.saveCurrentWorkflow({}, false);
						if (saved) this.$store.dispatch('settings/fetchPromptsData');
						if (this.$router.currentRoute.name === VIEWS.NEW_WORKFLOW) {
							this.$root.$emit('newWorkflow');
						} else {
							this.$router.push({ name: VIEWS.NEW_WORKFLOW });
						}
						this.$showMessage({
							title: this.$locale.baseText('mainSidebar.showMessage.handleSelect2.title'),
							type: 'success',
						});
					} else if (confirmModal === MODAL_CANCEL) {
						this.$store.commit('setStateDirty', false);
						if (this.$router.currentRoute.name === VIEWS.NEW_WORKFLOW) {
							this.$root.$emit('newWorkflow');
						} else {
							this.$router.push({ name: VIEWS.NEW_WORKFLOW });
						}
						this.$showMessage({
							title: this.$locale.baseText('mainSidebar.showMessage.handleSelect2.title'),
							type: 'success',
						});
					} else if (confirmModal === MODAL_CLOSE) {
						return;
					}
				} else {
					if (this.$router.currentRoute.name !== VIEWS.NEW_WORKFLOW) {
						this.$router.push({ name: VIEWS.NEW_WORKFLOW });
					}
					this.$showMessage({
						title: this.$locale.baseText('mainSidebar.showMessage.handleSelect3.title'),
						type: 'success',
					});
				}
				this.$titleReset();
			},
			findFirstAccessibleSettingsRoute () {
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

<style lang="scss">
#side-menu {
	.el-menu {
		--menu-item-active-background-color: var(--color-foreground-base);
		--menu-item-active-font-color: var(--color-text-dark);
		--menu-item-hover-fill: var(--color-foreground-base);
		--menu-item-hover-font-color: var(--color-text-dark);
		--menu-item-height: 35px;
		--submenu-item-height: 27px;

		.el-icon-arrow-down {
			font-weight: bold;
			right: 12px;

			&:hover {
				color: var(--color-primary);
			}
		}

		.el-menu-item:hover, .el-submenu__title:hover, .el-menu-item.is-active {
			svg {
				color: var(--color-text-dark);
			}
		}

		.el-menu-item, .el-menu-item .el-tooltip, .el-submenu__title {
			padding: 0 8px !important;
		}
		.el-menu-item, .el-submenu__title {
			margin: 8px 0;
			border-radius: var(--border-radius-base);
			user-select: none;

			.item-title-root {
				position: absolute;
				left: 45px;
			}

			svg {
				color: var(--color-text-light);
			}
		}

		.el-submenu {
			.el-menu-item {
				height: var(--menu-item-height);
				line-height: var(--menu-item-height);
				padding-left: var(--spacing-l) !important;
				min-width: auto;

				svg {
					width: var(--spacing-m);
				}
			}

			.el-menu .el-menu-item {
				height: var(--submenu-item-height);
				margin: 4px 0 !important;

				.item-title {
					position: absolute;
					left: 60px;
				}
			}
		}
	}
}

.sidebar-popper{
	.el-menu-item {
		--menu-item-height: 35px;
		--submenu-item-height: 27px;
		--menu-item-hover-fill: var(--color-foreground-base);
		border-radius: var(--border-radius-base);
		margin: 0 var(--spacing-2xs);

		.item-title {
			position: absolute;
			left: 55px;
		}

		.svg-inline--fa {
			color: var(--color-text-light);
			position: relative;
			right: -3px;
		}

		&:hover {
			.svg-inline--fa {
				color: var(--color-text-dark);
			}
		}
	}
}
</style>

<style lang="scss" module>

.sideMenu {
	height: 100%;

	&.sideMenuCollapsed {
		.fullName,
		:global(.item-title-root),
		:global(.el-menu--collapse) :global(.el-submenu__icon-arrow),
		:global(.el-icon-arrow-down) {
			display: none;
		}

		.active {
			background-color: var(--color-foreground-base);
			border-radius: var(--border-radius-base);

			svg { color: var(--color-text-dark) !important; }
		}

		.userSubmenu::before {
			width: 160%;
		}
	}

	svg:global(.svg-inline--fa) {
		position: relative;
		left: 3px;
	}

	svg:global(.svg-inline--fa.fa-home) { left: 4px; }
	.executionsSubmenu svg:global(.svg-inline--fa),
	.credentialsSubmenu svg:global(.svg-inline--fa),
	.updatesSubmenu svg:global(.svg-inline--fa),
	.settingsSubmenu svg:global(.svg-inline--fa)
	{ left: 5px !important; }

	.helpMenu{
		svg:global(.svg-inline--fa) { left: 6px !important; }
		:global(.el-menu--inline) { margin-bottom: 8px; }
	}
}

.sideMenuWrapper {
	position: relative;
	height: 100%;
	width: $sidebar-width;
	border-right: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	transition: width 150ms ease-in-out;

	&.expanded {
		width: $sidebar-expanded-width;

		.icon {
			position: relative;
			left: 16px;
		}
	}

	ul { height: 100%; }
}

.sideMenuCollapseButton {
	position: absolute;
	right: -10px;
	top: 50%;
	z-index: 999;
	display: flex;
	justify-content: center;
	align-items: flex-end;
	color: var(--color-text-base);
	background-color: var(--color-foreground-xlight);
	width: 20px;
	height: 20px;
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	text-align: center;
	border-radius: 50%;

	&::before {
		display: block;
		position: relative;
		left: px;
		top: -2.5px;
		transform: rotate(270deg);
		content: "\e6df";
		font-family: element-icons;
		font-size: var(--font-size-2xs);
		font-weight: bold;
		color: var(--color-text-base);
	}

	&.expandedButton {
		&::before {
			transform: rotate(90deg);
			left: 0px;
		}
	}

	&:hover {
		&::before {
			color: var(--color-primary-shade-1);
		}
	}
}

.sideMenuFlexContainer {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	height: calc(100% - $header-height);
	padding: var(--spacing-5xs) 0;
}

.sideMenuUpper, .sideMenuLower {
	padding: 0 var(--spacing-xs);
}


li:global(.is-active) {
	.sideMenuLower &, &.disableActiveStyle {
		background-color: initial;
		color: var(--color-text-base);

		svg {
			color: var(--color-text-base) !important;
		}

		&:hover {
			background-color: var(--color-foreground-base);
			svg {
				color: var(--color-text-dark) !important;
			}
			&:global(.el-submenu) {
				background-color: unset;
			}
		}
	}
}

.logoItem {
	display: flex;
	justify-content: space-between;
	height: $header-height;
	line-height: $header-height;
	margin: 0 !important;
	border-radius: 0 !important;
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-background-xlight);
	cursor: default;

	&:hover, &:global(.is-active):hover {
		background-color: initial !important;
	}

	* { vertical-align: middle; }
	.icon {
		height: 18px;
		position: relative;
		left: 6px;
	}

}

.footerMenuItems {
	display: flex;
	flex-grow: 1;
	flex-direction: column;
	justify-content: flex-end;
	padding-bottom: var(-spacing-m);

	&.loggedIn {
		padding-bottom: var(--spacing-xs);
	}
}

.aboutIcon {
	margin-left: 5px;
}

.updatesSubmenu {
	margin-top: 0 !important;

	.updatesLabel {
		font-size: var(--font-size-xs);
	}

	.giftContainer {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		height: 100%;
		width: 100%;

		div > div { right: -.5em; }
	}
}

.userSubmenu {
	position: relative;
	cursor: default;
	padding: var(--spacing-xs) !important;
	margin: 0 !important;

	// Fake border-top on user area
	&::before {
		width: 114%;
		border-top: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
		content: "";
		position: absolute;
		top: 0;
		left: -12px;
	}

	&:hover, &:global(.is-active) {
		background-color: initial !important;

		.userActions svg {
			color: var(--color-text-base) !important;
		}

	}

	.avatar {
		position: relative;
		left: -2px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 16px;
		cursor: default;
	}

	.username {
		position: relative !important;
		display: flex !important;
		left: 9px !important;
		justify-content: space-between;
		align-items: center;
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-2xs);
		padding-top: var(--spacing-s);
		cursor: default;

		.fullName {
			width: 99px;
			overflow: hidden;
			text-overflow: ellipsis;
			color: var(--color-text-dark);
		}
	}

	.userActions {
		position: relative;
		left: -1px;
		cursor: pointer;

		&:hover {
			svg { color: initial; }
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
