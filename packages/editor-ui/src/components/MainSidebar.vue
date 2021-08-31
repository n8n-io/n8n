<template>
	<div id="side-menu">
		<about :dialogVisible="aboutDialogVisible" @closeDialog="closeAboutDialog"></about>
		<executions-list :dialogVisible="executionsListDialogVisible" @closeDialog="closeExecutionsListOpenDialog"></executions-list>
		<credentials-list :dialogVisible="credentialOpenDialogVisible" @closeDialog="closeCredentialOpenDialog"></credentials-list>
		<credentials-edit :dialogVisible="credentialNewDialogVisible" @closeDialog="closeCredentialNewDialog"></credentials-edit>
		<workflow-settings :dialogVisible="workflowSettingsDialogVisible" @closeDialog="closeWorkflowSettingsDialog"></workflow-settings>
		<input type="file" ref="importFile" style="display: none" v-on:change="handleFileImport()">

		<div class="side-menu-wrapper" :class="{expanded: !isCollapsed}">
			<div id="collapse-change-button" class="clickable" @click="toggleCollapse">
				<font-awesome-icon icon="angle-right" class="icon" />
			</div>
			<el-menu default-active="workflow" @select="handleSelect" :collapse="isCollapsed">

				<el-menu-item index="logo" class="logo-item">
					<a href="https://n8n.io" target="_blank" class="logo">
						<img :src="basePath + 'n8n-icon-small.png'" class="icon" alt="n8n.io"/>
						<span class="logo-text" slot="title">n8n.io</span>
					</a>
				</el-menu-item>

				<MenuItemsIterator :items="sidebarMenuTopItems" :root="true"/>

				<el-submenu index="workflow" title="Workflow">
					<template slot="title">
						<font-awesome-icon icon="network-wired"/>&nbsp;
						<span slot="title" class="item-title-root">Workflows</span>
					</template>

					<el-menu-item index="workflow-new">
						<template slot="title">
							<font-awesome-icon icon="file"/>&nbsp;
							<span slot="title" class="item-title">New</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-open">
						<template slot="title">
							<font-awesome-icon icon="folder-open"/>&nbsp;
							<span slot="title" class="item-title">Open</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-save">
						<template slot="title">
							<font-awesome-icon icon="save"/>
							<span slot="title" class="item-title">Save</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-duplicate" :disabled="!currentWorkflow">
						<template slot="title">
							<font-awesome-icon icon="copy"/>
							<span slot="title" class="item-title">Duplicate</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-delete" :disabled="!currentWorkflow">
						<template slot="title">
							<font-awesome-icon icon="trash"/>
							<span slot="title" class="item-title">Delete</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-download">
						<template slot="title">
							<font-awesome-icon icon="file-download"/>
							<span slot="title" class="item-title">Download</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-import-url">
						<template slot="title">
							<font-awesome-icon icon="cloud"/>
							<span slot="title" class="item-title">Import from URL</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-import-file">
						<template slot="title">
							<font-awesome-icon icon="hdd"/>
							<span slot="title" class="item-title">Import from File</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-settings" :disabled="!currentWorkflow">
						<template slot="title">
							<font-awesome-icon icon="cog"/>
							<span slot="title" class="item-title">Settings</span>
						</template>
					</el-menu-item>
				</el-submenu>

				<el-submenu index="credentials" title="Credentials">
					<template slot="title">
						<font-awesome-icon icon="key"/>&nbsp;
						<span slot="title" class="item-title-root">Credentials</span>
					</template>

					<el-menu-item index="credentials-new">
						<template slot="title">
							<font-awesome-icon icon="file"/>
							<span slot="title" class="item-title">New</span>
						</template>
					</el-menu-item>
					<el-menu-item index="credentials-open">
						<template slot="title">
							<font-awesome-icon icon="folder-open"/>
							<span slot="title" class="item-title">Open</span>
						</template>
					</el-menu-item>
				</el-submenu>

				<el-menu-item index="executions">
					<font-awesome-icon icon="tasks"/>&nbsp;
					<span slot="title" class="item-title-root">Executions</span>
				</el-menu-item>

				<el-submenu index="help" class="help-menu" title="Help">
					<template slot="title">
						<font-awesome-icon icon="question"/>&nbsp;
						<span slot="title" class="item-title-root">Help</span>
					</template>

					<MenuItemsIterator :items="helpMenuItems" />

					<el-menu-item index="help-about">
						<template slot="title">
							<font-awesome-icon class="about-icon" icon="info"/>
							<span slot="title" class="item-title">About n8n</span>
						</template>
					</el-menu-item>
				</el-submenu>

				<MenuItemsIterator :items="sidebarMenuBottomItems" :root="true"/>

				<div class="footer-menu-items">
					<el-menu-item index="updates" class="updates" v-if="hasVersionUpdates" @click="openUpdatesPanel">
						<div class="gift-container">
							<GiftNotificationIcon />
						</div>
						<span slot="title" class="item-title-root">{{nextVersions.length > 99 ? '99+' : nextVersions.length}} update{{nextVersions.length > 1 ? 's' : ''}} available</span>
					</el-menu-item>
				</div>
			</el-menu>

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
import CredentialsEdit from '@/components/CredentialsEdit.vue';
import CredentialsList from '@/components/CredentialsList.vue';
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

const helpMenuItems: IMenuItem[] = [
	{
		id: 'docs',
		type: 'link',
		properties: {
			href: 'https://docs.n8n.io',
			title: 'Documentation',
			icon: 'book',
			newWindow: true,
		},
	},
	{
		id: 'forum',
		type: 'link',
		properties: {
			href: 'https://community.n8n.io',
			title: 'Forum',
			icon: 'users',
			newWindow: true,
		},
	},
	{
		id: 'examples',
		type: 'link',
		properties: {
			href: 'https://n8n.io/workflows',
			title: 'Workflows',
			icon: 'network-wired',
			newWindow: true,
		},
	},
];

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
			CredentialsEdit,
			CredentialsList,
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
				credentialNewDialogVisible: false,
				credentialOpenDialogVisible: false,
				executionsListDialogVisible: false,
				stopExecutionInProgress: false,
				workflowSettingsDialogVisible: false,
				helpMenuItems,
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
		},
		methods: {
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
			closeWorkflowSettingsDialog () {
				this.workflowSettingsDialogVisible = false;
			},
			closeExecutionsListOpenDialog () {
				this.executionsListDialogVisible = false;
			},
			closeCredentialOpenDialog () {
				this.credentialOpenDialogVisible = false;
			},
			closeCredentialNewDialog () {
				this.credentialNewDialogVisible = false;
			},
			openTagManager() {
				this.$store.dispatch('ui/openTagsManagerModal');
			},
			openUpdatesPanel() {
				this.$store.dispatch('ui/openUpdatesPanel');
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
						title: 'Execution stopped',
						message: `The execution with the id "${executionId}" got stopped!`,
						type: 'success',
					});
				} catch (error) {
					this.$showError(error, 'Problem stopping execution', 'There was a problem stopping the execuction:');
				}
				this.stopExecutionInProgress = false;
			},
			async openWorkflow (workflowId: string) {
				// Change to other workflow
				this.$router.push({
					name: 'NodeViewExisting',
					params: { name: workflowId },
				});

				this.$store.commit('ui/closeTopModal');
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
							title: 'Could not import file',
							message: `The file does not contain valid JSON data.`,
							type: 'error',
						});
						return;
					}

					this.$root.$emit('importWorkflowData', { data: worflowData });
				};

				const input = this.$refs.importFile as HTMLInputElement;
				if (input !== null && input.files !== null && input.files.length !== 0) {
					reader.readAsText(input!.files[0]!);
				}
			},
			async handleSelect (key: string, keyPath: string) {
				if (key === 'workflow-open') {
					this.$store.dispatch('ui/openWorklfowOpenModal');
				} else if (key === 'workflow-import-file') {
					(this.$refs.importFile as HTMLInputElement).click();
				} else if (key === 'workflow-import-url') {
					try {
						const promptResponse = await this.$prompt(`Workflow URL:`, 'Import Workflow from URL:', {
							confirmButtonText: 'Import',
							cancelButtonText: 'Cancel',
							inputErrorMessage: 'Invalid URL',
							inputPattern: /^http[s]?:\/\/.*\.json$/i,
						}) as MessageBoxInputData;

						this.$root.$emit('importWorkflowUrl', { url: promptResponse.value });
					} catch (e) {}
				} else if (key === 'workflow-delete') {
					const deleteConfirmed = await this.confirmMessage(`Are you sure that you want to delete the workflow "${this.workflowName}"?`, 'Delete Workflow?', 'warning', 'Yes, delete!');

					if (deleteConfirmed === false) {
						return;
					}

					try {
						await this.restApi().deleteWorkflow(this.currentWorkflow);
					} catch (error) {
						this.$showError(error, 'Problem deleting the workflow', 'There was a problem deleting the workflow:');
						return;
					}
					this.$store.commit('setStateDirty', false);
					// Reset tab title since workflow is deleted.
					this.$titleReset();
					this.$showMessage({
						title: 'Workflow got deleted',
						message: `The workflow "${this.workflowName}" got deleted!`,
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

					saveAs(blob, workflowName + '.json');
				} else if (key === 'workflow-save') {
					this.saveCurrentWorkflow();
				} else if (key === 'workflow-duplicate') {
					this.$store.dispatch('ui/openDuplicateModal');
				} else if (key === 'help-about') {
					this.aboutDialogVisible = true;
				} else if (key === 'workflow-settings') {
					this.workflowSettingsDialogVisible = true;
				} else if (key === 'workflow-new') {
					const result = this.$store.getters.getStateIsDirty;
					if(result) {
						const importConfirm = await this.confirmMessage(`When you switch workflows your current workflow changes will be lost.`, 'Save your Changes?', 'warning', 'Yes, switch workflows and forget changes');
						if (importConfirm === true) {
							this.$store.commit('setStateDirty', false);
							if (this.$router.currentRoute.name === 'NodeViewNew') {
								this.$root.$emit('newWorkflow');
							} else {
								this.$router.push({ name: 'NodeViewNew' });
							}

							this.$showMessage({
								title: 'Workflow created',
								message: 'A new workflow got created!',
								type: 'success',
							});
						}
					} else {
						if (this.$router.currentRoute.name !== 'NodeViewNew') {
							this.$router.push({ name: 'NodeViewNew' });
						}

						this.$showMessage({
							title: 'Workflow created',
							message: 'A new workflow got created!',
							type: 'success',
						});
					}
					this.$titleReset();
				} else if (key === 'credentials-open') {
					this.credentialOpenDialogVisible = true;
				} else if (key === 'credentials-new') {
					this.credentialNewDialogVisible = true;
				} else if (key === 'execution-open-workflow') {
					if (this.workflowExecution !== null) {
						this.openWorkflow(this.workflowExecution.workflowId as string);
					}
				} else if (key === 'executions') {
					this.executionsListDialogVisible = true;
				}
			},
		},
	});
</script>

<style lang="scss">
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

		.icon {
			position: relative;
			height: 23px;
			left: -10px;
			top: -2px;
		}
	}
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
	color: $--sidebar-inactive-color;
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
