<template>
	<span>
		<el-dialog class="workflow-settings" custom-class="classic" :visible="dialogVisible" append-to-body width="65%" title="Workflow Settings" :before-close="closeDialog">
			<div v-loading="isLoading">
				<el-row>
					<el-col :span="10" class="setting-name">
						Error Workflow:
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.errorWorkflow"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select v-model="workflowSettings.errorWorkflow" placeholder="Select Workflow" size="medium" filterable :limit-popper-width="true">
							<n8n-option
								v-for="item in workflows"
								:key="item.id"
								:label="item.name"
								:value="item.id">
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						Timezone:
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.timezone"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select v-model="workflowSettings.timezone" placeholder="Select Timezone" size="medium" filterable :limit-popper-width="true">
							<n8n-option
								v-for="timezone of timezones"
								:key="timezone.key"
								:label="timezone.value"
								:value="timezone.key">
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						Save Data Error Execution:
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.saveDataErrorExecution"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select v-model="workflowSettings.saveDataErrorExecution" placeholder="Select Option" size="medium" filterable :limit-popper-width="true">
							<n8n-option
								v-for="option of saveDataErrorExecutionOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key">
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						Save Data Success Execution:
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.saveDataSuccessExecution"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select v-model="workflowSettings.saveDataSuccessExecution" placeholder="Select Option" size="medium" filterable :limit-popper-width="true">
							<n8n-option
								v-for="option of saveDataSuccessExecutionOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key">
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						Save Manual Executions:
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.saveManualExecutions"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select v-model="workflowSettings.saveManualExecutions" placeholder="Select Option" size="medium" filterable :limit-popper-width="true">
							<n8n-option
								v-for="option of saveManualOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key">
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						Save Execution Progress:
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.saveExecutionProgress"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select v-model="workflowSettings.saveExecutionProgress" placeholder="Select Option" size="medium" filterable :limit-popper-width="true">
							<n8n-option
								v-for="option of saveExecutionProgressOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key">
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						Timeout Workflow:
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.executionTimeoutToggle"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14">
						<div>
							<el-switch ref="inputField" :value="workflowSettings.executionTimeout > -1" @change="toggleTimeout" active-color="#13ce66"></el-switch>
						</div>
					</el-col>
				</el-row>
				<div v-if="workflowSettings.executionTimeout > -1">
					<el-row>
						<el-col :span="10" class="setting-name">
							Timeout After:
							<n8n-tooltip class="setting-info" placement="top" >
								<div slot="content" v-html="helpTexts.executionTimeout"></div>
								<font-awesome-icon icon="question-circle" />
							</n8n-tooltip>
						</el-col>
						<el-col :span="4">
							<n8n-input size="medium" :value="timeoutHMS.hours" @input="(value) => setTimeout('hours', value)" :min="0">
								<template slot="append">hours</template>
							</n8n-input>
						</el-col>
						<el-col :span="4" class="timeout-input">
							<n8n-input size="medium" :value="timeoutHMS.minutes" @input="(value) => setTimeout('minutes', value)" :min="0" :max="60">
								<template slot="append">minutes</template>
							</n8n-input>
						</el-col>
						<el-col :span="4" class="timeout-input">
							<n8n-input size="medium" :value="timeoutHMS.seconds" @input="(value) => setTimeout('seconds', value)" :min="0" :max="60">
								<template slot="append">seconds</template>
							</n8n-input>
						</el-col>
					</el-row>
				</div>
				<div class="action-buttons">
					<n8n-button label="Save" size="large" @click="saveSettings" />
				</div>
			</div>
		</el-dialog>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

import { externalHooks } from '@/components/mixins/externalHooks';
import { restApi } from '@/components/mixins/restApi';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import {
	ITimeoutHMS,
	IWorkflowDataUpdate,
	IWorkflowSettings,
	IWorkflowShortResponse,
} from '@/Interface';

import mixins from 'vue-typed-mixins';

export default mixins(
	externalHooks,
	genericHelpers,
	restApi,
	showMessage,
).extend({
	name: 'WorkflowSettings',
	props: [
		'dialogVisible',
	],
	data () {
		return {
			isLoading: true,
			helpTexts: {
				errorWorkflow: 'The workflow to run in case the current one fails.<br />To function correctly that workflow has to contain an "Error Trigger" node!',
				timezone: 'The timezone in which the workflow should run. Gets for example used by "Cron" node.',
				saveDataErrorExecution: 'If data data of executions should be saved in case they failed.',
				saveDataSuccessExecution: 'If data data of executions should be saved in case they succeed.',
				saveExecutionProgress: 'If data should be saved after each node, allowing you to resume in case of errors from where it stopped. May increase latency.',
				saveManualExecutions: 'If data data of executions should be saved when started manually from the editor.',
				executionTimeoutToggle: 'Cancel workflow execution after defined time',
				executionTimeout: 'After what time the workflow should timeout.',
			},
			defaultValues: {
				timezone: 'America/New_York',
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				saveExecutionProgress: false,
				saveManualExecutions: false,
			},
			saveDataErrorExecutionOptions: [] as Array<{ key: string, value: string }>,
			saveDataSuccessExecutionOptions: [] as Array<{ key: string, value: string }>,
			saveExecutionProgressOptions: [] as Array<{ key: string | boolean, value: string }>,
			saveManualOptions: [] as Array<{ key: string | boolean, value: string }>,
			timezones: [] as Array<{ key: string, value: string }>,
			workflowSettings: {} as IWorkflowSettings,
			workflows: [] as IWorkflowShortResponse[],
			executionTimeout: this.$store.getters.executionTimeout,
			maxExecutionTimeout: this.$store.getters.maxExecutionTimeout,
			timeoutHMS: { hours: 0, minutes: 0, seconds: 0 } as ITimeoutHMS,
		};
	},
	watch: {
		dialogVisible (newValue, oldValue) {
			if (newValue) {
				this.openDialog();
			}
			this.$externalHooks().run('workflowSettings.dialogVisibleChanged', { dialogVisible: newValue });
		},
	},
	methods: {
		closeDialog () {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},
		setTimeout (key: string, value: string) {
			const time = value ? parseInt(value, 10) : 0;

			this.timeoutHMS = {
				...this.timeoutHMS,
				[key]: time,
			};
		},
		async loadSaveDataErrorExecutionOptions () {
			this.saveDataErrorExecutionOptions.length = 0;
			this.saveDataErrorExecutionOptions.push.apply( // eslint-disable-line no-useless-call
				this.saveDataErrorExecutionOptions, [
					{
						key: 'DEFAULT',
						value: 'Default - ' + (this.defaultValues.saveDataErrorExecution === 'all' ? 'Save' : 'Do not save'),
					},
					{
						key: 'all',
						value: 'Save',
					},
					{
						key: 'none',
						value: 'Do not save',
					},
				],
			);
		},
		async loadSaveDataSuccessExecutionOptions () {
			this.saveDataSuccessExecutionOptions.length = 0;
			this.saveDataSuccessExecutionOptions.push.apply( // eslint-disable-line no-useless-call
				this.saveDataSuccessExecutionOptions, [
					{
						key: 'DEFAULT',
						value: 'Default - ' + (this.defaultValues.saveDataSuccessExecution === 'all' ? 'Save' : 'Do not save'),
					},
					{
						key: 'all',
						value: 'Save',
					},
					{
						key: 'none',
						value: 'Do not save',
					},
				],
			);
		},
		async loadSaveExecutionProgressOptions () {
			this.saveExecutionProgressOptions.length = 0;
			this.saveExecutionProgressOptions.push.apply( // eslint-disable-line no-useless-call
				this.saveExecutionProgressOptions, [
					{
						key: 'DEFAULT',
						value: 'Default - ' + (this.defaultValues.saveExecutionProgress === true ? 'Yes' : 'No'),
					},
					{
						key: true,
						value: 'Yes',
					},
					{
						key: false,
						value: 'No',
					},
				],
			);
		},
		async loadSaveManualOptions () {
			this.saveManualOptions.length = 0;
			this.saveManualOptions.push({
				key: 'DEFAULT',
				value: 'Default - ' + (this.defaultValues.saveManualExecutions === true ? 'Yes' : 'No'),
			});
			this.saveManualOptions.push({
				key: true,
				value: 'Yes',
			});
			this.saveManualOptions.push({
				key: false,
				value: 'No',
			});
		},

		async loadTimezones () {
			if (this.timezones.length !== 0) {
				// Data got already loaded
				return;
			}

			const timezones = await this.restApi().getTimezones();

			let defaultTimezoneValue = timezones[this.defaultValues.timezone] as string | undefined;
			if (defaultTimezoneValue === undefined) {
				defaultTimezoneValue = 'Default Timezone not valid!';
			}

			this.timezones.push({
				key: 'DEFAULT',
				value: `Default - ${defaultTimezoneValue}`,
			});
			for (const timezone of Object.keys(timezones)) {
				this.timezones.push({
					key: timezone,
					value: timezones[timezone] as string,
				});
			}
		},
		async loadWorkflows () {
			const workflows = await this.restApi().getWorkflows();
			workflows.sort((a, b) => {
				if (a.name.toLowerCase() < b.name.toLowerCase()) {
					return -1;
				}
				if (a.name.toLowerCase() > b.name.toLowerCase()) {
					return 1;
				}
				return 0;
			});

			// @ts-ignore
			workflows.unshift({
				id: undefined as unknown as string,
				name: '- No Workflow -',
			});

			Vue.set(this, 'workflows', workflows);
		},
		async openDialog () {
			if (this.$route.params.name === undefined) {
				this.$showMessage({
					title: 'No workflow active',
					message: `No workflow active to display settings of.`,
					type: 'error',
					duration: 0,
				});
				this.closeDialog();
				return;
			}

			this.defaultValues.saveDataErrorExecution = this.$store.getters.saveDataErrorExecution;
			this.defaultValues.saveDataSuccessExecution = this.$store.getters.saveDataSuccessExecution;
			this.defaultValues.saveManualExecutions = this.$store.getters.saveManualExecutions;
			this.defaultValues.timezone = this.$store.getters.timezone;

			this.isLoading = true;
			const promises = [];
			promises.push(this.loadWorkflows());
			promises.push(this.loadSaveDataErrorExecutionOptions());
			promises.push(this.loadSaveDataSuccessExecutionOptions());
			promises.push(this.loadSaveExecutionProgressOptions());
			promises.push(this.loadSaveManualOptions());
			promises.push(this.loadTimezones());

			try {
				await Promise.all(promises);
			} catch (error) {
				this.$showError(error, 'Problem loading settings', 'The following error occurred loading the data:');
			}

			const workflowSettings = JSON.parse(JSON.stringify(this.$store.getters.workflowSettings));

			if (workflowSettings.timezone === undefined) {
				workflowSettings.timezone = 'DEFAULT';
			}
			if (workflowSettings.saveDataErrorExecution === undefined) {
				workflowSettings.saveDataErrorExecution = 'DEFAULT';
			}
			if (workflowSettings.saveDataSuccessExecution === undefined) {
				workflowSettings.saveDataSuccessExecution = 'DEFAULT';
			}
			if (workflowSettings.saveExecutionProgress === undefined) {
				workflowSettings.saveExecutionProgress = 'DEFAULT';
			}
			if (workflowSettings.saveManualExecutions === undefined) {
				workflowSettings.saveManualExecutions = 'DEFAULT';
			}
			if (workflowSettings.executionTimeout === undefined) {
				workflowSettings.executionTimeout = this.$store.getters.executionTimeout;
			}
			if (workflowSettings.maxExecutionTimeout === undefined) {
				workflowSettings.maxExecutionTimeout = this.$store.getters.maxExecutionTimeout;
			}

			Vue.set(this, 'workflowSettings', workflowSettings);
			this.timeoutHMS = this.convertToHMS(workflowSettings.executionTimeout);
			this.isLoading = false;
		},
		async saveSettings () {
			// Set that the active state should be changed
			const data: IWorkflowDataUpdate = {
				settings: this.workflowSettings,
			};

			// Convert hours, minutes, seconds into seconds for the workflow timeout
			const { hours, minutes, seconds } = this.timeoutHMS;
			data.settings!.executionTimeout =
				data.settings!.executionTimeout !== -1
					? hours * 3600 + minutes * 60 + seconds
					: -1;

			if (data.settings!.executionTimeout === 0) {
				this.$showError(new Error('timeout is activated but set to 0'), 'Problem saving settings', 'There was a problem saving the settings:');
				return;
			}

			// @ts-ignore
			if (data.settings!.executionTimeout > this.workflowSettings.maxExecutionTimeout) {
				const { hours, minutes, seconds } = this.convertToHMS(this.workflowSettings.maxExecutionTimeout as number);
				this.$showError(new Error(`Maximum Timeout is: ${hours} hours, ${minutes} minutes, ${seconds} seconds`), 'Problem saving settings', 'Set timeout is exceeding the maximum timeout!');
				return;
			}
			delete data.settings!.maxExecutionTimeout;

			this.isLoading = true;

			try {
				await this.restApi().updateWorkflow(this.$route.params.name, data);
			} catch (error) {
				this.$showError(error, 'Problem saving settings', 'There was a problem saving the settings:');
				this.isLoading = false;
				return;
			}

			// Get the settings without the defaults set for local workflow settings
			const localWorkflowSettings: IWorkflowSettings = {};
			for (const key of Object.keys(this.workflowSettings)) {
				if (this.workflowSettings[key] !== 'DEFAULT') {
					localWorkflowSettings[key] = this.workflowSettings[key];
				}
			}

			const oldSettings = JSON.parse(JSON.stringify(this.$store.getters.workflowSettings));

			this.$store.commit('setWorkflowSettings', localWorkflowSettings);

			this.isLoading = false;

			this.$showMessage({
				title: 'Settings saved',
				message: 'The workflow settings got saved!',
				type: 'success',
			});

			this.closeDialog();

			this.$externalHooks().run('workflowSettings.saveSettings', { oldSettings });
		},
		toggleTimeout() {
			this.workflowSettings.executionTimeout = this.workflowSettings.executionTimeout === -1 ? 0 : -1;
		},
		convertToHMS(num: number): ITimeoutHMS {
			if (num > 0) {
				let remainder: number;
				const hours = Math.floor(num / 3600);
				remainder = num % 3600;
				const minutes = Math.floor(remainder / 60);
				const seconds = remainder % 60;
				return { hours, minutes, seconds };
			}
			return { hours: 0, minutes: 0, seconds: 0 };
		},
	},
});
</script>

<style scoped lang="scss">
.workflow-settings {
	.el-row {
		padding: 0.25em 0;
	}
}

.action-buttons {
	margin-top: 1em;
	text-align: right;
}

.setting-info {
	display: none;
}

.setting-name {
	line-height: 32px;
}

.setting-name:hover {
	.setting-info {
		display: inline;
	}
}

.timeout-input {
	margin-left: 5px;
}

</style>
