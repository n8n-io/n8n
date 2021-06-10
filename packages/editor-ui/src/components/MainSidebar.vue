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

				<el-submenu index="workflow" :title="$t('mainSideBar.workflow')">
					<template slot="title">
						<font-awesome-icon icon="network-wired"/>&nbsp;
						<span slot="title" class="item-title-root">{{ $t('mainSideBar.workflows') }}</span>
					</template>

					<el-menu-item index="workflow-new">
						<template slot="title">
							<font-awesome-icon icon="file"/>&nbsp;
							<span slot="title" class="item-title">{{ $t('mainSideBar.new') }}</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-open">
						<template slot="title">
							<font-awesome-icon icon="folder-open"/>&nbsp;
							<span slot="title" class="item-title">{{ $t('mainSideBar.open') }}</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-save">
						<template slot="title">
							<font-awesome-icon icon="save"/>
							<span slot="title" class="item-title">{{ $t('mainSideBar.save') }}</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-duplicate" :disabled="!currentWorkflow">
						<template slot="title">
							<font-awesome-icon icon="copy"/>
							<span slot="title" class="item-title">{{ $t('mainSideBar.duplicate') }}</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-delete" :disabled="!currentWorkflow">
						<template slot="title">
							<font-awesome-icon icon="trash"/>
							<span slot="title" class="item-title">{{ $t('mainSideBar.delete') }}</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-download">
						<template slot="title">
							<font-awesome-icon icon="file-download"/>
							<span slot="title" class="item-title">{{ $t('mainSideBar.download') }}</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-import-url">
						<template slot="title">
							<font-awesome-icon icon="cloud"/>
							<span slot="title" class="item-title">{{ $t('mainSideBar.importFromUrl') }}</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-import-file">
						<template slot="title">
							<font-awesome-icon icon="hdd"/>
							<span slot="title" class="item-title">{{ $t('mainSideBar.importFromFile') }}</span>
						</template>
					</el-menu-item>
					<el-menu-item index="workflow-settings" :disabled="!currentWorkflow">
						<template slot="title">
							<font-awesome-icon icon="cog"/>
							<span slot="title" class="item-title">{{ $t('mainSideBar.settings') }}</span>
						</template>
					</el-menu-item>
				</el-submenu>

				<el-submenu index="credentials" :title="$t('mainSideBar.credentials')">
					<template slot="title">
						<font-awesome-icon icon="key"/>&nbsp;
						<span slot="title" class="item-title-root">{{ $t('mainSideBar.credentials') }}</span>
					</template>

					<el-menu-item index="credentials-new">
						<template slot="title">
							<font-awesome-icon icon="file"/>
							<span slot="title" class="item-title">{{ $t('mainSideBar.new') }}</span>
						</template>
					</el-menu-item>
					<el-menu-item index="credentials-open">
						<template slot="title">
							<font-awesome-icon icon="folder-open"/>
							<span slot="title" class="item-title">{{ $t('mainSideBar.open') }}</span>
						</template>
					</el-menu-item>
				</el-submenu>

				<el-menu-item index="executions">
					<font-awesome-icon icon="tasks"/>&nbsp;
					<span slot="title" class="item-title-root">{{ $t('mainSideBar.executions') }}</span>
				</el-menu-item>

				<el-submenu index="help" class="help-menu" :title="$t('mainSideBar.help')">
					<template slot="title">
						<font-awesome-icon icon="question"/>&nbsp;
						<span slot="title" class="item-title-root">{{ $t('mainSideBar.executions') }}</span>
					</template>

					<MenuItemsIterator :items="helpMenuItems" />

					<el-menu-item index="help-about">
						<template slot="title">
							<font-awesome-icon class="about-icon" icon="info"/>
							<span slot="title" class="item-title">{{ $t('mainSideBar.aboutN8n') }}</span>
						</template>
					</el-menu-item>
				</el-submenu>

				<MenuItemsIterator :items="sidebarMenuBottomItems" :root="true"/>

			</el-menu>

		</div>
	</div>

</template>

<script lang="ts">

import { MessageBoxInputData } from 'element-ui/types/message-box';

import {
	IExecutionResponse,
	IExecutionsStopData,
	IWorkflowDataUpdate,
	IMenuItem,
} from '../Interface';

import About from '@/components/About.vue';
import CredentialsEdit from '@/components/CredentialsEdit.vue';
import CredentialsList from '@/components/CredentialsList.vue';
import ExecutionsList from '@/components/ExecutionsList.vue';
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
				helpMenuItems: [
					{
						id: 'docs',
						type: 'link',
						properties: {
							href: 'https://docs.n8n.io',
							title: this.$t('mainSideBar.helpMenuItems.documentation'),
							icon: 'book',
							newWindow: true,
						},
					},
					{
						id: 'forum',
						type: 'link',
						properties: {
							href: 'https://community.n8n.io',
							title: this.$t('mainSideBar.helpMenuItems.forum'),
							icon: 'users',
							newWindow: true,
						},
					},
					{
						id: 'examples',
						type: 'link',
						properties: {
							href: 'https://n8n.io/workflows',
							title: this.$t('mainSideBar.helpMenuItems.workflows'),
							icon: 'network-wired',
							newWindow: true,
						},
					},
				],
			};
		},
		computed: {
			...mapGetters('ui', {
				isCollapsed: 'sidebarMenuCollapsed',
			}),
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
			async stopExecution () {
				const executionId = this.$store.getters.activeExecutionId;
				if (executionId === null) {
					return;
				}

				try {
					this.stopExecutionInProgress = true;
					const stopData: IExecutionsStopData = await this.restApi().stopCurrentExecution(executionId);
					this.$showMessage({
						title: this.$t('mainSideBar.showMessage.stopExecution.title').toString(),
						message: this.$t('mainSideBar.showMessage.stopExecution.message').toString(),
						type: 'success',
					});
				} catch (error) {
					this.$showError(
						error,
						this.$t('mainSideBar.showError.stopExecution.title').toString(),
						`${this.$t('mainSideBar.showError.stopExecution.message').toString()}:`,
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
							title: this.$t('mainSideBar.showMessage.handleFileImport.title').toString(),
							message: this.$t('mainSideBar.showMessage.handleFileImport.message').toString(),
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
						const promptResponse = await this.$prompt(
							this.$t('mainSideBar.prompt.workflowUrl').toString(),
							this.$t('mainSideBar.prompt.importWorkflowFromUrl').toString(),
							{
								confirmButtonText: this.$t('mainSideBar.prompt.import').toString(),
								cancelButtonText: this.$t('mainSideBar.prompt.cancel').toString(),
								inputErrorMessage: this.$t('mainSideBar.prompt.invalidUrl').toString(),
								inputPattern: /^http[s]?:\/\/.*\.json$/i,
							},
						) as MessageBoxInputData;

						this.$root.$emit('importWorkflowUrl', { url: promptResponse.value });
					} catch (e) {}
				} else if (key === 'workflow-delete') {
					const deleteConfirmed = await this.confirmMessage(
						this.$t('mainSideBar.confirmMessage.message').toString(),
						this.$t('mainSideBar.confirmMessage.headline').toString(),
						'warning',
						this.$t('mainSideBar.confirmMessage.confirmButtonText').toString(),
						this.$t('mainSideBar.confirmMessage.cancelButtonText').toString(),
					);

					if (deleteConfirmed === false) {
						return;
					}

					let result;
					try {
						result = await this.restApi().deleteWorkflow(this.currentWorkflow);
					} catch (error) {
						this.$showError(
							error,
							this.$t('mainSideBar.showError.stopExecution.title').toString(),
							`${this.$t('mainSideBar.showError.stopExecution.message').toString()}:`,
						);
						return;
					}
					// Reset tab title since workflow is deleted.
					this.$titleReset();
					this.$showMessage({
						title: this.$t('mainSideBar.showMessage.handleSelect.title').toString(),
						message: this.$t('mainSideBar.showMessage.handleSelect.message').toString(),
						type: 'success',
					});

					this.$router.push({ name: 'NodeViewNew' });
				} else if (key === 'workflow-download') {
					const workflowData = await this.getWorkflowDataToSave();

					const {tags, ...data} = workflowData;
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
							this.$router.push({ name: 'NodeViewNew' });

							this.$showMessage({
								title: this.$t('mainSideBar.showMessage.worklowNewImportConfirmTrue.title').toString(),
								message: this.$t('mainSideBar.showMessage.worklowNewImportConfirmTrue.message').toString(),
								type: 'success',
							});
						}
					} else {
						this.$router.push({ name: 'NodeViewNew' });

						this.$showMessage({
							title: this.$t('mainSideBar.showMessage.worklowNewImportConfirmFalse.title').toString(),
								message: this.$t('mainSideBar.showMessage.worklowNewImportConfirmFalse.message').toString(),
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
	padding-left: 5px;
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
}

</style>
