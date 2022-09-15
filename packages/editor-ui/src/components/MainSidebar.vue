<template>
	<div id="side-menu" :class="['side-menu', $style.sideMenu]">
		<input type="file" ref="importFile" style="display: none" v-on:change="handleFileImport()">

		<div :class="$style.sideMenuWrapper">
			<div
				id="collapse-change-button"
				:class="['clickable', $style.sideMenuCollapseButton]"
				@click="toggleCollapse"
			>
				<font-awesome-icon v-if="isCollapsed" icon="angle-right" :class="$style.iconCollapsed" />
				<font-awesome-icon v-else icon="angle-left" :class="$style.iconExpanded" />
			</div>
			<n8n-menu default-active="workflow" @select="handleSelect" :collapse="isCollapsed">
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

						<el-submenu index="workflow" title="Workflow" popperClass="sidebar-popper">
							<template slot="title">
								<font-awesome-icon icon="network-wired"/>&nbsp;
								<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.workflows') }}</span>
							</template>

							<n8n-menu-item index="workflow-new">
								<template slot="title">
									<font-awesome-icon icon="file"/>&nbsp;
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.new') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item v-if="isTemplatesEnabled" index="template-new">
								<template slot="title">
									<font-awesome-icon icon="box-open"/>&nbsp;
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.newTemplate') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item index="workflow-open">
								<template slot="title">
									<font-awesome-icon icon="folder-open"/>&nbsp;
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.open') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item index="workflow-save" :disabled="!onWorkflowPage">
								<template slot="title">
									<font-awesome-icon icon="save"/>
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.save') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item index="workflow-duplicate" :disabled="!onWorkflowPage || !currentWorkflow">
								<template slot="title">
									<font-awesome-icon icon="copy"/>
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.duplicate') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item index="workflow-delete" :disabled="!onWorkflowPage || !currentWorkflow">
								<template slot="title">
									<font-awesome-icon icon="trash"/>
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.delete') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item index="workflow-download" :disabled="!onWorkflowPage">
								<template slot="title">
									<font-awesome-icon icon="file-download"/>
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.download') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item index="workflow-import-url" :disabled="!onWorkflowPage">
								<template slot="title">
									<font-awesome-icon icon="cloud"/>
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.importFromUrl') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item index="workflow-import-file" :disabled="!onWorkflowPage">
								<template slot="title">
									<font-awesome-icon icon="hdd"/>
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.importFromFile') }}</span>
								</template>
							</n8n-menu-item>
							<n8n-menu-item index="workflow-settings" :disabled="!onWorkflowPage || !currentWorkflow">
								<template slot="title">
									<font-awesome-icon icon="cog"/>
									<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.settings') }}</span>
								</template>
							</n8n-menu-item>
						</el-submenu>

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
										<span>{{currentUser.fullName}}</span>
										<el-dropdown placement="right-end" trigger="click" @command="onUserActionToggle">
											<div :class="{[$style.userActions]: true, ['user-actions']: true }">
												<n8n-icon icon="ellipsis-v" />
												<el-dropdown-menu slot="dropdown" :class="$style.userActionsMenu">
													<el-dropdown-item command="settings">{{ $locale.baseText('settings') }}</el-dropdown-item>
													<el-dropdown-item command="logout">{{ $locale.baseText('auth.signout') }}</el-dropdown-item>
												</el-dropdown-menu>
											</div>
										</el-dropdown>
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

import { MessageBoxInputData } from 'element-ui/types/message-box';

import {
	IExecutionResponse,
	IWorkflowDataUpdate,
	IMenuItem,
	IWorkflowToShare,
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

import { saveAs } from 'file-saver';

import mixins from 'vue-typed-mixins';
import { mapGetters } from 'vuex';
import MenuItemsIterator from './MenuItemsIterator.vue';
import {
	ABOUT_MODAL_KEY,
	CREDENTIAL_LIST_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
	DUPLICATE_MODAL_KEY,
	MODAL_CANCEL,
	MODAL_CLOSE,
	MODAL_CONFIRMED,
	TAGS_MANAGER_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_OPEN_MODAL_KEY,
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
			async handleFileImport () {
				const reader = new FileReader();

				reader.onload = (event: ProgressEvent) => {
					const data = (event.target as FileReader).result;

					let workflowData: IWorkflowDataUpdate;
					try {
						workflowData = JSON.parse(data as string);
					} catch (error) {
						this.$showMessage({
							title: this.$locale.baseText('mainSidebar.showMessage.handleFileImport.title'),
							message: this.$locale.baseText('mainSidebar.showMessage.handleFileImport.message'),
							type: 'error',
						});
						return;
					}

					this.$root.$emit('importWorkflowData', { data: workflowData });
				};

				const input = this.$refs.importFile as HTMLInputElement;
				if (input !== null && input.files !== null && input.files.length !== 0) {
					reader.readAsText(input!.files[0]!);
				}
			},
			async handleSelect (key: string, keyPath: string) {
				if (key === 'workflow-open') {
					this.$store.dispatch('ui/openModal', WORKFLOW_OPEN_MODAL_KEY);
				} else if (key === 'workflow-import-file') {
					(this.$refs.importFile as HTMLInputElement).click();
				} else if (key === 'workflow-import-url') {
					try {
						const promptResponse = await this.$prompt(
							this.$locale.baseText('mainSidebar.prompt.workflowUrl') + ':',
							this.$locale.baseText('mainSidebar.prompt.importWorkflowFromUrl') + ':',
							{
								confirmButtonText: this.$locale.baseText('mainSidebar.prompt.import'),
								cancelButtonText: this.$locale.baseText('mainSidebar.prompt.cancel'),
								inputErrorMessage: this.$locale.baseText('mainSidebar.prompt.invalidUrl'),
								inputPattern: /^http[s]?:\/\/.*\.json$/i,
							},
						) as MessageBoxInputData;

						this.$root.$emit('importWorkflowUrl', { url: promptResponse.value });
					} catch (e) {}
				} else if (key === 'workflow-delete') {
					const deleteConfirmed = await this.confirmMessage(
						this.$locale.baseText(
							'mainSidebar.confirmMessage.workflowDelete.message',
							{ interpolate: { workflowName: this.workflowName } },
						),
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.headline'),
						'warning',
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.confirmButtonText'),
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.cancelButtonText'),
					);

					if (deleteConfirmed === false) {
						return;
					}

					try {
						await this.restApi().deleteWorkflow(this.currentWorkflow);
					} catch (error) {
						this.$showError(
							error,
							this.$locale.baseText('mainSidebar.showError.stopExecution.title'),
						);
						return;
					}
					this.$store.commit('setStateDirty', false);
					// Reset tab title since workflow is deleted.
					this.$titleReset();
					this.$showMessage({
						title: this.$locale.baseText('mainSidebar.showMessage.handleSelect1.title'),
						type: 'success',
					});

					this.$router.push({ name: VIEWS.NEW_WORKFLOW });
				} else if (key === 'workflow-download') {
					const workflowData = await this.getWorkflowDataToSave();

					const {tags, ...data} = workflowData;
					if (data.id && typeof data.id === 'string') {
						data.id = parseInt(data.id, 10);
					}

					const exportData: IWorkflowToShare = {
						...data,
						meta: {
							instanceId: this.$store.getters.instanceId,
						},
						tags: (tags || []).map(tagId => {
							const {usageCount, ...tag} = this.$store.getters["tags/getTagById"](tagId);

							return tag;
						}),
					};

					const blob = new Blob([JSON.stringify(exportData, null, 2)], {
						type: 'application/json;charset=utf-8',
					});


					let workflowName = this.$store.getters.workflowName || 'unsaved_workflow';

					workflowName = workflowName.replace(/[^a-z0-9]/gi, '_');

					this.$telemetry.track('User exported workflow', { workflow_id: workflowData.id });

					saveAs(blob, workflowName + '.json');
				} else if (key === 'workflow-save') {
					const saved = await this.saveCurrentWorkflow();
					if (saved) this.$store.dispatch('settings/fetchPromptsData');
				} else if (key === 'workflow-duplicate') {
					this.$store.dispatch('ui/openModal', DUPLICATE_MODAL_KEY);
				} else if (key === 'help-about') {
					this.trackHelpItemClick('about');
					this.$store.dispatch('ui/openModal', ABOUT_MODAL_KEY);
				} else if (key === 'workflow-settings') {
					this.$store.dispatch('ui/openModal', WORKFLOW_SETTINGS_MODAL_KEY);
				} else if (key === 'user') {
					this.$router.push({name: VIEWS.PERSONAL_SETTINGS});
				} else if (key === 'workflow-new') {
					const result = this.$store.getters.getStateIsDirty;
					if(result) {
						const confirmModal = await this.confirmModal(
							this.$locale.baseText('mainSidebar.confirmMessage.workflowNew.message'),
							this.$locale.baseText('mainSidebar.confirmMessage.workflowNew.headline'),
							'warning',
							this.$locale.baseText('mainSidebar.confirmMessage.workflowNew.confirmButtonText'),
							this.$locale.baseText('mainSidebar.confirmMessage.workflowNew.cancelButtonText'),
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
		width: 68%;
		left: 13px !important;
		justify-content: space-between;
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
	// Menu
	.el-menu--vertical,
	.el-menu {
		border: none;
		font-size: 14px;
		--menu-item-hover-fill: var(--color-foreground-base);

		.el-menu--popup,
		.el-menu--inline {
			font-size: 0.9em;
			li.el-menu-item {
				height: 35px;
				line-height: 35px;
				color: $--custom-dialog-text-color;
			}
		}

		.el-menu-item,
		.el-submenu__title {
			display: flex;
			align-items: center;
			color: var(--color-text-dark);
			font-size: 1.2em;
			.el-submenu__icon-arrow {
				color: var(--color-text-dark);
				font-weight: 800;
				font-size: 1em;
			}
			.svg-inline--fa {
				position: relative;
				right: -3px;
			}
			.item-title {
				position: absolute;
				left: 56px;
				font-size: var(--font-size-s);
			}
			.item-title-root {
				position: absolute;
				left: 60px;
				top: 1px;
			}
		}

		.el-menu--inline {
			.el-menu-item {
				padding-left: 30px!important;
			}
		}

	}

	.el-menu-item {
		min-width: 200px;
		a {
			color: var(--color-text-base);

			&.primary-item {
				color: $--color-primary;
				vertical-align: baseline;
			}
		}
	}
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
