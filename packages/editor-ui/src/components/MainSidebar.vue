<template>
	<div id="side-menu">
		<about :dialogVisible="aboutDialogVisible" @closeDialog="closeAboutDialog"></about>
		<input type="file" ref="importFile" style="display: none" v-on:change="handleFileImport()">

		<div class="side-menu-wrapper" :class="{expanded: !isCollapsed}">
			<div id="collapse-change-button" class="clickable" @click="toggleCollapse">
				<font-awesome-icon icon="angle-right" class="icon" />
			</div>
			<n8n-menu default-active="workflow" @select="handleSelect" :collapse="isCollapsed">

				<n8n-menu-item index="logo" class="logo-item">
					<a href="https://n8n.io" target="_blank" class="logo">
						<img :src="basePath + 'n8n-icon-small.png'" class="icon" alt="n8n.io"/>
						<span class="logo-text" slot="title">n8n.io</span>
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

				<el-submenu index="help" class="help-menu" title="Help" popperClass="sidebar-popper">
					<template slot="title">
						<font-awesome-icon icon="question"/>&nbsp;
						<span slot="title" class="item-title-root">{{ $locale.baseText('mainSidebar.help') }}</span>
					</template>

					<MenuItemsIterator :items="helpMenuItems" :afterItemClick="trackHelpItemClick" />

					<n8n-menu-item index="help-about">
						<template slot="title">
							<font-awesome-icon class="about-icon" icon="info"/>
							<span slot="title" class="item-title">{{ $locale.baseText('mainSidebar.aboutN8n') }}</span>
						</template>
					</n8n-menu-item>
				</el-submenu>

				<MenuItemsIterator :items="sidebarMenuBottomItems" :root="true"/>

				<div class="footer-menu-items">
					<n8n-menu-item index="updates" class="updates" v-if="hasVersionUpdates" @click="openUpdatesPanel">
						<div class="gift-container">
							<GiftNotificationIcon />
						</div>
						<span slot="title" class="item-title-root">{{nextVersions.length > 99 ? '99+' : nextVersions.length}} update{{nextVersions.length > 1 ? 's' : ''}} available</span>
					</n8n-menu-item>
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
} from '../Interface';

import About from '@/components/About.vue';
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
import MenuItemsIterator from './MainSidebarMenuItemsIterator.vue';
import {
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
} from '@/constants';

export default mixins(
	genericHelpers,
	restApi,
	showMessage,
	titleChange,
	workflowHelpers,
	workflowRun,
)
	.extend({
		name: 'MainHeader',
		components: {
			About,
			ExecutionsList,
			GiftNotificationIcon,
			WorkflowSettings,
			MenuItemsIterator,
		},
		data () {
			return {
				aboutDialogVisible: false,
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
			...mapGetters('settings', [
				'isTemplatesEnabled',
			]),
			helpMenuItems (): object[] {
				return [
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
							href: 'https://n8n.io/workflows',
							title: this.$locale.baseText('mainSidebar.helpMenuItems.workflows'),
							icon: 'network-wired',
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
					// We are not on an exeuction page so return false
					return false;
				}

				const fullExecution = this.$store.getters.getWorkflowExecution;

				if (fullExecution === null) {
					// No exeuction loaded so return also false
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
				if (['ExecutionById'].includes(this.$route.name as string)) {
					return true;
				}
				return false;
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
		methods: {
			trackHelpItemClick (itemType: string) {
				this.$telemetry.track('User clicked help resource', { type: itemType, workflow_id: this.$store.getters.workflowId });
			},
			toggleCollapse () {
				this.$store.commit('ui/toggleSidebarMenuCollapse');
			},
			clearExecutionData () {
				this.$store.commit('setWorkflowExecutionData', null);
				this.updateNodesExecutionIssues();
			},
			closeAboutDialog () {
				this.aboutDialogVisible = false;
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
					name: 'NodeViewExisting',
					params: { name: workflowId },
				});

				this.$store.commit('ui/closeAllModals');
			},
			async handleFileImport () {
				const reader = new FileReader();

				reader.onload = (event: ProgressEvent) => {
					const data = (event.target as FileReader).result;

					let worflowData: IWorkflowDataUpdate;
					try {
						worflowData = JSON.parse(data as string);
					} catch (error) {
						this.$showMessage({
							title: this.$locale.baseText('mainSidebar.showMessage.handleFileImport.title'),
							message: this.$locale.baseText('mainSidebar.showMessage.handleFileImport.message'),
							type: 'error',
						});
						return;
					}

					this.$telemetry.track('User imported workflow', { source: 'file', workflow_id: this.$store.getters.workflowId });
					this.$root.$emit('importWorkflowData', { data: worflowData });
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

					this.$router.push({ name: 'NodeViewNew' });
				} else if (key === 'workflow-download') {
					const workflowData = await this.getWorkflowDataToSave();

					const {tags, ...data} = workflowData;
					if (data.id && typeof data.id === 'string') {
						data.id = parseInt(data.id, 10);
					}
					const blob = new Blob([JSON.stringify(data, null, 2)], {
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
					this.aboutDialogVisible = true;
					this.trackHelpItemClick('about');
				} else if (key === 'workflow-settings') {
					this.$store.dispatch('ui/openModal', WORKFLOW_SETTINGS_MODAL_KEY);
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

							if (this.$router.currentRoute.name === 'NodeViewNew') {
								this.$root.$emit('newWorkflow');
							} else {
								this.$router.push({ name: 'NodeViewNew' });
							}

							this.$showMessage({
								title: this.$locale.baseText('mainSidebar.showMessage.handleSelect2.title'),
								type: 'success',
							});
						} else if (confirmModal === MODAL_CANCEL) {
							this.$store.commit('setStateDirty', false);
							if (this.$router.currentRoute.name === 'NodeViewNew') {
								this.$root.$emit('newWorkflow');
							} else {
								this.$router.push({ name: 'NodeViewNew' });
							}

							this.$showMessage({
								title: this.$locale.baseText('mainSidebar.showMessage.handleSelect2.title'),
								type: 'success',
							});
						} else if (confirmModal === MODAL_CLOSE) {
							return;
						}
					} else {
						if (this.$router.currentRoute.name !== 'NodeViewNew') {
							this.$router.push({ name: 'NodeViewNew' });
						}

						this.$showMessage({
							title: this.$locale.baseText('mainSidebar.showMessage.handleSelect3.title'),
							type: 'success',
						});
					}
					this.$titleReset();
				} else if (key === 'templates' || key === 'template-new') {
					if (this.$router.currentRoute.name !== 'TemplatesSearchView') {
						this.$router.push({ name: 'TemplatesSearchView' });
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
				}
			},
		},
	});
</script>

<style lang="scss">
.sidebar-popper{
	.el-menu-item {
		font-size: 0.9em;
		height: 35px;
		line-height: 35px;
		color: $--custom-dialog-text-color;
		--menu-item-hover-fill: #fff0ef;

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
		--menu-item-hover-fill: #fff0ef;

		.el-menu--collapse {
			width: 75px;
		}

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
			color: $--color-primary;
			font-size: 1.2em;
			.el-submenu__icon-arrow {
				color: $--color-primary;
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
		a {
			color: #666;

			&.primary-item {
				color: $--color-primary;
				vertical-align: baseline;
			}
		}

		&.logo-item {
			background-color: $--color-primary !important;
			height: $--header-height;
			line-height: $--header-height;
			* {
				vertical-align: middle;
			}


			.icon {
				position: relative;
				height: 23px;
				left: -10px;
				top: -2px;
			}
		}
	}
}

.about-icon {
	margin-left: 5px;
}

#collapse-change-button {
	position: absolute;
	z-index: 10;
	top: 55px;
	left: 25px;
	text-align: right;
	line-height: 24px;
	height: 20px;
	width: 20px;
	background-color: #fff;
	border: none;
	border-radius: 15px;

	-webkit-transition-duration: 0.5s;
	-moz-transition-duration: 0.5s;
	-o-transition-duration: 0.5s;
	transition-duration: 0.5s;

	-webkit-transition-property: -webkit-transform;
	-moz-transition-property: -moz-transform;
	-o-transition-property: -o-transform;
	transition-property: transform;

	overflow: hidden;

	.icon {
		position: relative;
		left: -5px;
		top: -2px;
	}
}
#collapse-change-button:hover {
	transform: scale(1.1);
}

a.logo {
	text-decoration: none;
}

.logo-text {
	position: relative;
	top: -3px;
	left: 5px;
	font-weight: bold;
	color: #fff;
	text-decoration: none;
}

.expanded #collapse-change-button {
	-webkit-transform: translateX(60px) rotate(180deg);
	-moz-transform: translateX(60px) rotate(180deg);
	-o-transform: translateX(60px) rotate(180deg);
	transform: translateX(60px) rotate(180deg);
}

#side-menu {
	position: fixed;
	height: 100%;

	.el-menu {
		height: 100%;
	}
}

.side-menu-wrapper {
	height: 100%;
	width: $--sidebar-width;

	&.expanded {
		width: $--sidebar-expanded-width;
	}

	ul {
		display: flex;
		flex-direction: column;
	}
}

.footer-menu-items {
	display: flex;
	flex-grow: 1;
	flex-direction: column;
	justify-content: flex-end;
	padding-bottom: 32px;
}

.el-menu-item.updates {
	color: $--sidebar-inactive-color !important;
	.item-title-root {
		font-size: 13px;
		top: 0 !important;
	}

	&:hover {
		color: $--sidebar-active-color;
	}

	.gift-container {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		height: 100%;
		width: 100%;
	}
}

</style>
