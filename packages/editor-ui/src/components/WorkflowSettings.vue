<template>
	<Modal
		:name="WORKFLOW_SETTINGS_MODAL_KEY"
		width="65%"
		maxHeight="80%"
		:title="$locale.baseText('workflowSettings.settingsFor', { interpolate: { workflowName, workflowId } })"
		:eventBus="modalBus"
		:scrollable="true"
	>
		<template v-slot:content>
			<div v-loading="isLoading" class="workflow-settings">
				<el-row>
					<el-col :span="10" class="setting-name">
						{{ $locale.baseText('workflowSettings.errorWorkflow') + ":" }}
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
						{{ $locale.baseText('workflowSettings.timezone') + ":" }}
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
						{{ $locale.baseText('workflowSettings.saveDataErrorExecution') + ":" }}
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.saveDataErrorExecution"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select v-model="workflowSettings.saveDataErrorExecution" :placeholder="$locale.baseText('workflowSettings.selectOption')" size="medium" filterable :limit-popper-width="true">
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
						{{ $locale.baseText('workflowSettings.saveDataSuccessExecution') + ":" }}
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.saveDataSuccessExecution"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select v-model="workflowSettings.saveDataSuccessExecution" :placeholder="$locale.baseText('workflowSettings.selectOption')" size="medium" filterable :limit-popper-width="true">
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
						{{ $locale.baseText('workflowSettings.saveManualExecutions') + ":" }}
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.saveManualExecutions"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select v-model="workflowSettings.saveManualExecutions" :placeholder="$locale.baseText('workflowSettings.selectOption')" size="medium" filterable :limit-popper-width="true">
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
						{{ $locale.baseText('workflowSettings.saveExecutionProgress') + ":" }}
						<n8n-tooltip class="setting-info" placement="top" >
							<div slot="content" v-html="helpTexts.saveExecutionProgress"></div>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select v-model="workflowSettings.saveExecutionProgress" :placeholder="$locale.baseText('workflowSettings.selectOption')" size="medium" filterable :limit-popper-width="true">
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
						{{ $locale.baseText('workflowSettings.timeoutWorkflow') + ":" }}
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
							{{ $locale.baseText('workflowSettings.timeoutAfter') + ":" }}
							<n8n-tooltip class="setting-info" placement="top" >
								<div slot="content" v-html="helpTexts.executionTimeout"></div>
								<font-awesome-icon icon="question-circle" />
							</n8n-tooltip>
						</el-col>
						<el-col :span="4">
							<n8n-input size="medium" :value="timeoutHMS.hours" @input="(value) => setTimeout('hours', value)" :min="0">
								<template slot="append">{{ $locale.baseText('workflowSettings.hours') }}</template>
							</n8n-input>
						</el-col>
						<el-col :span="4" class="timeout-input">
							<n8n-input size="medium" :value="timeoutHMS.minutes" @input="(value) => setTimeout('minutes', value)" :min="0" :max="60">
								<template slot="append">{{ $locale.baseText('workflowSettings.minutes') }}</template>
							</n8n-input>
						</el-col>
						<el-col :span="4" class="timeout-input">
							<n8n-input size="medium" :value="timeoutHMS.seconds" @input="(value) => setTimeout('seconds', value)" :min="0" :max="60">
								<template slot="append">{{ $locale.baseText('workflowSettings.seconds') }}</template>
							</n8n-input>
						</el-col>
					</el-row>
				</div>
			</div>
		</template>
		<template v-slot:footer>
			<div class="action-buttons">
				<n8n-button :label="$locale.baseText('workflowSettings.save')" size="large" float="right" @click="saveSettings" />
			</div>
		</template>
	</Modal>
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
import Modal from './Modal.vue';
import { WORKFLOW_SETTINGS_MODAL_KEY } from '../constants';

import mixins from 'vue-typed-mixins';

import { mapGetters } from "vuex";

export default mixins(
	externalHooks,
	genericHelpers,
	restApi,
	showMessage,
).extend({
	name: 'WorkflowSettings',
	components: {
		Modal,
	},
	data () {
		return {
			isLoading: true,
			helpTexts: {
				errorWorkflow: this.$locale.baseText('workflowSettings.helpTexts.errorWorkflow'),
				timezone: this.$locale.baseText('workflowSettings.helpTexts.timezone'),
				saveDataErrorExecution: this.$locale.baseText('workflowSettings.helpTexts.saveDataErrorExecution'),
				saveDataSuccessExecution: this.$locale.baseText('workflowSettings.helpTexts.saveDataSuccessExecution'),
				saveExecutionProgress: this.$locale.baseText('workflowSettings.helpTexts.saveExecutionProgress'),
				saveManualExecutions: this.$locale.baseText('workflowSettings.helpTexts.saveManualExecutions'),
				executionTimeoutToggle: this.$locale.baseText('workflowSettings.helpTexts.executionTimeoutToggle'),
				executionTimeout: this.$locale.baseText('workflowSettings.helpTexts.executionTimeout'),
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
			modalBus: new Vue(),
			WORKFLOW_SETTINGS_MODAL_KEY,
		};
	},

	computed: {
		...mapGetters(['workflowName', 'workflowId']),
	},

	async mounted () {
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

		this.$externalHooks().run('workflowSettings.dialogVisibleChanged', { dialogVisible: true });
		this.$telemetry.track('User opened workflow settings', { workflow_id: this.$store.getters.workflowId });
	},
	methods: {
		closeDialog () {
			this.modalBus.$emit('close');
			this.$externalHooks().run('workflowSettings.dialogVisibleChanged', { dialogVisible: false });
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
						value: this.$locale.baseText(
							'workflowSettings.saveDataErrorExecutionOptions.defaultSave',
							{
								interpolate: {
									defaultValue: this.defaultValues.saveDataErrorExecution === 'all'
										? this.$locale.baseText('workflowSettings.saveDataErrorExecutionOptions.save')
										: this.$locale.baseText('workflowSettings.saveDataErrorExecutionOptions.doNotsave'),
								},
							},
						),
					},
					{
						key: 'all',
						value: this.$locale.baseText('workflowSettings.saveDataErrorExecutionOptions.save'),
					},
					{
						key: 'none',
						value: this.$locale.baseText('workflowSettings.saveDataErrorExecutionOptions.doNotSave'),
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
						value: this.$locale.baseText(
							'workflowSettings.saveDataSuccessExecutionOptions.defaultSave',
							{
								interpolate: {
									defaultValue: this.defaultValues.saveDataSuccessExecution === 'all'
										? this.$locale.baseText('workflowSettings.saveDataSuccessExecutionOptions.save')
										: this.$locale.baseText('workflowSettings.saveDataSuccessExecutionOptions.doNotSave'),
								},
							},
						),
					},
					{
						key: 'all',
						value: this.$locale.baseText('workflowSettings.saveDataSuccessExecutionOptions.save'),
					},
					{
						key: 'none',
						value: this.$locale.baseText('workflowSettings.saveDataSuccessExecutionOptions.doNotSave'),
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
						value: this.$locale.baseText(
							'workflowSettings.saveExecutionProgressOptions.defaultSave',
							{
								interpolate: {
									defaultValue: this.defaultValues.saveExecutionProgress ? this.$locale.baseText('workflowSettings.saveExecutionProgressOptions.yes') : this.$locale.baseText('workflowSettings.saveExecutionProgressOptions.no'),
								},
							},
						),
					},
					{
						key: true,
						value: this.$locale.baseText('workflowSettings.saveExecutionProgressOptions.yes'),
					},
					{
						key: false,
						value: this.$locale.baseText('workflowSettings.saveExecutionProgressOptions.no'),
					},
				],
			);
		},
		async loadSaveManualOptions () {
			this.saveManualOptions.length = 0;
			this.saveManualOptions.push({
				key: 'DEFAULT',
				value: this.$locale.baseText(
					'workflowSettings.saveManualOptions.defaultSave',
					{
						interpolate: {
							defaultValue: this.defaultValues.saveManualExecutions ? this.$locale.baseText('workflowSettings.saveManualOptions.yes') : this.$locale.baseText('workflowSettings.saveManualOptions.no'),
						},
					},
				),
			});
			this.saveManualOptions.push({
				key: true,
				value: this.$locale.baseText('workflowSettings.saveManualOptions.yes'),
			});
			this.saveManualOptions.push({
				key: false,
				value: this.$locale.baseText('workflowSettings.saveManualOptions.no'),
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
				defaultTimezoneValue = this.$locale.baseText('workflowSettings.defaultTimezoneNotValid');
			}

			this.timezones.push({
				key: 'DEFAULT',
				value: this.$locale.baseText(
					'workflowSettings.defaultTimezone',
					{ interpolate: { defaultTimezoneValue } },
				),
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
				name: this.$locale.baseText('workflowSettings.noWorkflow'),
			});

			Vue.set(this, 'workflows', workflows);
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
				this.$showError(
					new Error(this.$locale.baseText('workflowSettings.showError.saveSettings1.errorMessage')),
					this.$locale.baseText('workflowSettings.showError.saveSettings1.title'),
					this.$locale.baseText('workflowSettings.showError.saveSettings1.message') + ':',
				);
				return;
			}

			// @ts-ignore
			if (data.settings!.executionTimeout > this.workflowSettings.maxExecutionTimeout) {
				const { hours, minutes, seconds } = this.convertToHMS(this.workflowSettings.maxExecutionTimeout as number);
				this.$showError(
					new Error(
						this.$locale.baseText(
							'workflowSettings.showError.saveSettings2.errorMessage',
							{
								interpolate: {
									hours: hours.toString(),
									minutes: minutes.toString(),
									seconds: seconds.toString(),
								},
							},
						),
					),
					this.$locale.baseText('workflowSettings.showError.saveSettings2.title'),
					this.$locale.baseText('workflowSettings.showError.saveSettings2.message') + ':',
				);
				return;
			}
			delete data.settings!.maxExecutionTimeout;

			this.isLoading = true;

			try {
				await this.restApi().updateWorkflow(this.$route.params.name, data);
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('workflowSettings.showError.saveSettings3.title'),
					this.$locale.baseText('workflowSettings.showError.saveSettings3.message') + ':',
				);
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
				title: this.$locale.baseText('workflowSettings.showMessage.saveSettings.title'),
				message: this.$locale.baseText('workflowSettings.showMessage.saveSettings.message'),
				type: 'success',
			});

			this.closeDialog();

			this.$externalHooks().run('workflowSettings.saveSettings', { oldSettings });
			this.$telemetry.track('User updated workflow settings', { workflow_id: this.$store.getters.workflowId });
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
	font-size: var(--font-size-s);
	.el-row {
		padding: 0.25em 0;
	}
}

.setting-info {
	display: none;
}

.setting-name {
	line-height: 32px;
	font-weight: var(--font-weight-regular);
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
