<template>
	<div id="side-menu" :class="{
		['side-menu']: true,
		[$style.sideMenu]: true,
		[$style.sideMenuCollapsed]: isCollapsed
	}">
		<div
			id="collapse-change-button"
			:class="{ ['clickable']: true, [$style.sideMenuCollapseButton]: true, [$style.expandedButton]: !isCollapsed }"
			@click="toggleCollapse">
		</div>
		<n8n-menu :items="mainMenuItems" :collapsed="isCollapsed" @select="handleSelect">
			<template #header>
				<div :class="$style.logo">
					<img :src="basePath +  (isCollapsed ? 'n8n-logo-collapsed.svg' : 'n8n-logo-expanded.svg')" :class="$style.icon" alt="n8n"/>
				</div>
			</template>
			<template #menuSuffix v-if="hasVersionUpdates">
				<div :class="$style.updates" @click="openUpdatesPanel">
						<div :class="$style.giftContainer">
							<GiftNotificationIcon />
						</div>
						<n8n-text :class="{['ml-xs']: true, [$style.expanded]: fullyExpanded }" color="text-base">
							{{ nextVersions.length > 99 ? '99+' : nextVersions.length}} update{{nextVersions.length > 1 ? 's' : '' }}
						</n8n-text>
				</div>
			</template>
			<template #footer v-if="showUserArea">
				<div :class="$style.userArea">
					<div class="ml-3xs">
						<!-- This dropdown is only enabled when sidebar is collapsed -->
						<el-dropdown :disabled="!isCollapsed" placement="right-end" trigger="click" @command="onUserActionToggle">
							<div :class="{[$style.avatar]: true, ['clickable']: isCollapsed }">
								<n8n-avatar :firstName="usersStore.currentUser.firstName" :lastName="usersStore.currentUser.lastName" size="small" />
								<el-dropdown-menu slot="dropdown">
									<el-dropdown-item command="settings">{{ $locale.baseText('settings') }}</el-dropdown-item>
									<el-dropdown-item command="logout">{{ $locale.baseText('auth.signout') }}</el-dropdown-item>
								</el-dropdown-menu>
							</div>
						</el-dropdown>
					</div>
					<div :class="{ ['ml-2xs']: true, [$style.userName]: true, [$style.expanded]: fullyExpanded }">
						<n8n-text size="small" :bold="true" color="text-dark">{{usersStore.currentUser.fullName}}</n8n-text>
					</div>
					<div :class="{ [$style.userActions]: true, [$style.expanded]: fullyExpanded }">
						<n8n-action-dropdown :items="userMenuItems" placement="top-start" @select="onUserActionToggle" />
					</div>
				</div>
			</template>
		</n8n-menu>
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
import {
	MODAL_CANCEL,
	MODAL_CLOSE,
	MODAL_CONFIRMED,
	ABOUT_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	EXECUTIONS_MODAL_KEY,
	VIEWS,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
} from '@/constants';
import { userHelpers } from './mixins/userHelpers';
import { debounceHelper } from './mixins/debounce';
import Vue from 'vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useUsersStore } from '@/stores/users';
import { useWorkflowsStore } from '@/stores/workflows';
import { useRootStore } from '@/stores/n8nRootStore';

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
		},
		data () {
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
				useWorkflowsStore,
			),
			...mapGetters('versions', [
				'hasVersionUpdates',
				'nextVersions',
			]),
			isCollapsed(): boolean {
				return this.uiStore.sidebarMenuCollapsed;
			},
			canUserAccessSettings(): boolean {
				const accessibleRoute = this.findFirstAccessibleSettingsRoute();
				return accessibleRoute !== null;
			},
			showUserArea(): boolean {
				return this.settingsStore.isUserManagementEnabled && this.usersStore.canUserAccessSidebarUserInfo && this.usersStore.currentUser !== null;
			},
			workflowExecution (): IExecutionResponse | null {
				return this.workflowsStore.getWorkflowExecution;
			},
			userMenuItems (): object[] {
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
 			mainMenuItems (): IMenuItem[] {
				const items: IMenuItem[] = [];
				const injectedItems =  this.uiStore.sidebarMenuItems;

				if (injectedItems && injectedItems.length > 0) {
					for(const item of injectedItems) {
						items.push(
								{
								id: item.id,
								// @ts-ignore
								icon: item.properties ? item.properties.icon : '',
								// @ts-ignore
								label: item.properties ? item.properties.title : '',
								position: item.position,
								type: item.properties?.href ? 'link' : 'regular',
								properties: item.properties,
							} as IMenuItem,
						);
					}
				};

				const regularItems: IMenuItem[] = [
					{
						id: 'workflows',
						icon: 'network-wired',
						label: this.$locale.baseText('mainSidebar.workflows'),
						position: 'top',
						activateOnRouteNames: [ VIEWS.WORKFLOWS ],
					},
					{
						id: 'templates',
						icon: 'box-open',
						label: this.$locale.baseText('mainSidebar.templates'),
						position: 'top',
						available: this.settingsStore.isTemplatesEnabled,
						activateOnRouteNames: [ VIEWS.TEMPLATES ],
					},
					{
						id: 'credentials',
						icon: 'key',
						label: this.$locale.baseText('mainSidebar.credentials'),
						customIconSize: 'medium',
						position: 'top',
						activateOnRouteNames: [ VIEWS.CREDENTIALS ],
					},
					{
						id: 'executions',
						icon: 'tasks',
						label: this.$locale.baseText('generic.executions'),
						position: 'top',
					},
					{
						id: 'settings',
						icon: 'cog',
						label: this.$locale.baseText('settings'),
						position: 'bottom',
						available: this.canUserAccessSettings && this.usersStore.currentUser !== null,
						activateOnRouteNames: [ VIEWS.USERS_SETTINGS, VIEWS.API_SETTINGS, VIEWS.PERSONAL_SETTINGS ],
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
									href: 'https://www.youtube.com/watch?v=RpjQTGKm-ok',
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
									href: 'https://www.youtube.com/watch?v=RpjQTGKm-ok',
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
				return [ ...items, ...regularItems ];
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
			window.addEventListener("resize", this.onResize);
		},
		destroyed() {
			window.removeEventListener("resize", this.onResize);
		},
		methods: {
			trackHelpItemClick (itemType: string) {
				this.$telemetry.track('User clicked help resource', { type: itemType, workflow_id: this.workflowsStore.workflowId });
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
					await this.usersStore.logout();
					const route = this.$router.resolve({ name: VIEWS.SIGNIN });
					window.open(route.href, '_self');
				} catch (e) {
					this.$showError(e, this.$locale.baseText('auth.signout.error'));
				}
			},
			toggleCollapse () {
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
			async handleSelect (key: string) {
				switch (key) {
					case 'workflows': {
						if (this.$router.currentRoute.name !== VIEWS.WORKFLOWS) {
							this.$router.push({name: VIEWS.WORKFLOWS});
						}
						break;
					}
					case 'templates': {
						if (this.$router.currentRoute.name !== VIEWS.TEMPLATES) {
							this.$router.push({ name: VIEWS.TEMPLATES });
						}
						break;
					}
					case 'credentials': {
						if (this.$router.currentRoute.name !== VIEWS.CREDENTIALS) {
							this.$router.push({name: VIEWS.CREDENTIALS});
						}
						break;
					}
					case 'executions': {
						this.uiStore.openModal(EXECUTIONS_MODAL_KEY);
						break;
					}
					case 'settings': {
						const defaultRoute = this.findFirstAccessibleSettingsRoute();
						if (defaultRoute) {
							const routeProps = this.$router.resolve({ name: defaultRoute });
							if (this.$router.currentRoute.name !== defaultRoute) {
								this.$router.push(routeProps.route.path);
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
					case 'examples' : {
						this.trackHelpItemClick(key);
						break;
					}
					default: break;
				}
			},
			async createNewWorkflow (): Promise<void> {
				const result = this.uiStore.stateIsDirty;
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
						if (saved) await this.settingsStore.fetchPromptsData();
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
						this.uiStore.stateIsDirty = false;
						if (this.$router.currentRoute.name === VIEWS.NEW_WORKFLOW) {
							this.$root.$emit('newWorkflow');
						} else {
							this.workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
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
						this.workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
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
					this.uiStore.sidebarMenuCollapsed = true;
					Vue.nextTick(() => {
						this.fullyExpanded = !this.isCollapsed;
					});
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

.updates {
	display: flex;
	align-items: center;
	height: 26px;
	cursor: pointer;

	svg {	color: var(--color-text-base) !important; }
	span {
		display: none;
		&.expanded { display: initial; }
	}

	&:hover {
		&, & svg {
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
	:global(#help) { display: none; }
}
</style>
