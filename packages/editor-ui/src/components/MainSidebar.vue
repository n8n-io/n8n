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
		<n8n-menu :items="mainMenuItems" :collapsed="isCollapsed" @select="handleSelect"></n8n-menu>
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
				userMenuItems: [ // TODO: Move to computed
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
			workflowExecution (): IExecutionResponse | null {
				return this.$store.getters.getWorkflowExecution;
			},
			sidebarMenuTopItems(): IMenuItem[] {
				return this.$store.getters.sidebarMenuItems.filter((item: IMenuItem) => item.position === 'top');
			},
			sidebarMenuBottomItems(): IMenuItem[] {
				return this.$store.getters.sidebarMenuItems.filter((item: IMenuItem) => item.position === 'bottom');
			},
			mainMenuItems (): object[] {
				return [
					{
						id: 'workflows',
						icon: 'network-wired',
						label: this.$locale.baseText('mainSidebar.workflows'),
						position: 'top',
						children: [
							{
								id: 'workflow',
								label: this.$locale.baseText('mainSidebar.new'),
								icon: 'file',
							},
							{
								id: 'workflow-open',
								label: this.$locale.baseText('mainSidebar.open'),
								icon: 'folder-open',
							},
						],
					},
					{
						id: 'templates',
						icon: 'box-open',
						label: this.$locale.baseText('mainSidebar.templates'),
						position: 'top',
						// TODO: Only available if templates are enabled
					},
					{
						id: 'credentials',
						icon: 'key',
						label: this.$locale.baseText('mainSidebar.credentials'),
						position: 'top',
					},
					{
						id: 'executions',
						icon: 'tasks',
						label: this.$locale.baseText('mainSidebar.executions'),
						position: 'top',
					},
					{
						id: 'settings',
						icon: 'cog',
						label: this.$locale.baseText('settings'),
						position: 'bottom',
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
						],
					},
					{
						id: 'about',
						icon: 'info',
						label: this.$locale.baseText('mainSidebar.aboutN8n'),
						position: 'bottom',
					},
				];
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
					case 'workflow': {
						await this.createNewWorkflow();
						break;
					}
					case 'workflow-open': {
						this.$store.dispatch('ui/openModal', WORKFLOW_OPEN_MODAL_KEY);
						break;
					}
					case 'templates': {
						if (this.$router.currentRoute.name !== VIEWS.TEMPLATES) {
							this.$router.push({ name: VIEWS.TEMPLATES });
						}
						break;
					}
					case 'credentials': {
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
					case 'about': {
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

<style lang="scss" module>

.sideMenu {
	position: relative;
	height: 100%;
	border-right: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	transition: width 150ms ease-in-out;
	width: $sidebar-expanded-width;

	&.sideMenuCollapsed {
		width: $sidebar-width;
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

@media screen and (max-height: 470px) {
	.helpMenu { display: none; }
}
</style>
