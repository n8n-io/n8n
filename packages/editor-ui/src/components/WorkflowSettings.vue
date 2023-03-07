<template>
	<Modal
		:name="WORKFLOW_SETTINGS_MODAL_KEY"
		width="65%"
		maxHeight="80%"
		:title="
			$locale.baseText('workflowSettings.settingsFor', {
				interpolate: { workflowName, workflowId },
			})
		"
		:eventBus="modalBus"
		:scrollable="true"
	>
		<template #content>
			<div v-loading="isLoading" class="workflow-settings" data-test-id="workflow-settings-dialog">
				<el-row>
					<el-col :span="10" class="setting-name">
						{{ $locale.baseText('workflowSettings.errorWorkflow') + ':' }}
						<n8n-tooltip class="setting-info" placement="top">
							<template #content>
								<div v-html="helpTexts.errorWorkflow"></div>
							</template>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select
							v-model="workflowSettings.errorWorkflow"
							placeholder="Select Workflow"
							size="medium"
							filterable
							:limit-popper-width="true"
							data-test-id="workflow-settings-error-workflow"
						>
							<n8n-option
								v-for="item in workflows"
								:key="item.id"
								:label="item.name"
								:value="item.id"
							>
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<div v-if="isSharingEnabled">
					<el-row>
						<el-col :span="10" class="setting-name">
							{{ $locale.baseText('workflowSettings.callerPolicy') + ':' }}
							<n8n-tooltip class="setting-info" placement="top">
								<template #content>
									<div v-text="helpTexts.workflowCallerPolicy"></div>
								</template>
								<font-awesome-icon icon="question-circle" />
							</n8n-tooltip>
						</el-col>

						<el-col :span="14" class="ignore-key-press">
							<n8n-select
								v-model="workflowSettings.callerPolicy"
								:placeholder="$locale.baseText('workflowSettings.selectOption')"
								size="medium"
								filterable
								:limit-popper-width="true"
							>
								<n8n-option
									v-for="option of workflowCallerPolicyOptions"
									:key="option.key"
									:label="option.value"
									:value="option.key"
								>
								</n8n-option>
							</n8n-select>
						</el-col>
					</el-row>
					<el-row v-if="workflowSettings.callerPolicy === 'workflowsFromAList'">
						<el-col :span="10" class="setting-name">
							{{ $locale.baseText('workflowSettings.callerIds') + ':' }}
							<n8n-tooltip class="setting-info" placement="top">
								<template #content>
									<div v-text="helpTexts.workflowCallerIds"></div>
								</template>
								<font-awesome-icon icon="question-circle" />
							</n8n-tooltip>
						</el-col>
						<el-col :span="14">
							<n8n-input
								:placeholder="$locale.baseText('workflowSettings.callerIds.placeholder')"
								type="text"
								size="medium"
								v-model="workflowSettings.callerIds"
								@input="onCallerIdsInput"
							/>
						</el-col>
					</el-row>
				</div>
				<el-row>
					<el-col :span="10" class="setting-name">
						{{ $locale.baseText('workflowSettings.timezone') + ':' }}
						<n8n-tooltip class="setting-info" placement="top">
							<template #content>
								<div v-text="helpTexts.timezone"></div>
							</template>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select
							v-model="workflowSettings.timezone"
							placeholder="Select Timezone"
							size="medium"
							filterable
							:limit-popper-width="true"
							data-test-id="workflow-settings-timezone"
						>
							<n8n-option
								v-for="timezone of timezones"
								:key="timezone.key"
								:label="timezone.value"
								:value="timezone.key"
							>
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						{{ $locale.baseText('workflowSettings.saveDataErrorExecution') + ':' }}
						<n8n-tooltip class="setting-info" placement="top">
							<template #content>
								<div v-text="helpTexts.saveDataErrorExecution"></div>
							</template>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select
							v-model="workflowSettings.saveDataErrorExecution"
							:placeholder="$locale.baseText('workflowSettings.selectOption')"
							size="medium"
							filterable
							:limit-popper-width="true"
							data-test-id="workflow-settings-save-failed-executions"
						>
							<n8n-option
								v-for="option of saveDataErrorExecutionOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key"
							>
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						{{ $locale.baseText('workflowSettings.saveDataSuccessExecution') + ':' }}
						<n8n-tooltip class="setting-info" placement="top">
							<template #content>
								<div v-text="helpTexts.saveDataSuccessExecution"></div>
							</template>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select
							v-model="workflowSettings.saveDataSuccessExecution"
							:placeholder="$locale.baseText('workflowSettings.selectOption')"
							size="medium"
							filterable
							:limit-popper-width="true"
							data-test-id="workflow-settings-save-success-executions"
						>
							<n8n-option
								v-for="option of saveDataSuccessExecutionOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key"
							>
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						{{ $locale.baseText('workflowSettings.saveManualExecutions') + ':' }}
						<n8n-tooltip class="setting-info" placement="top">
							<template #content>
								<div v-text="helpTexts.saveManualExecutions"></div>
							</template>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select
							v-model="workflowSettings.saveManualExecutions"
							:placeholder="$locale.baseText('workflowSettings.selectOption')"
							size="medium"
							filterable
							:limit-popper-width="true"
							data-test-id="workflow-settings-save-manual-executions"
						>
							<n8n-option
								v-for="option of saveManualOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key"
							>
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						{{ $locale.baseText('workflowSettings.saveExecutionProgress') + ':' }}
						<n8n-tooltip class="setting-info" placement="top">
							<template #content>
								<div v-text="helpTexts.saveExecutionProgress"></div>
							</template>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14" class="ignore-key-press">
						<n8n-select
							v-model="workflowSettings.saveExecutionProgress"
							:placeholder="$locale.baseText('workflowSettings.selectOption')"
							size="medium"
							filterable
							:limit-popper-width="true"
							data-test-id="workflow-settings-save-execution-progress"
						>
							<n8n-option
								v-for="option of saveExecutionProgressOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key"
							>
							</n8n-option>
						</n8n-select>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="10" class="setting-name">
						{{ $locale.baseText('workflowSettings.timeoutWorkflow') + ':' }}
						<n8n-tooltip class="setting-info" placement="top">
							<template #content>
								<div v-text="helpTexts.executionTimeoutToggle"></div>
							</template>
							<font-awesome-icon icon="question-circle" />
						</n8n-tooltip>
					</el-col>
					<el-col :span="14">
						<div>
							<el-switch
								ref="inputField"
								:value="workflowSettings.executionTimeout > -1"
								@change="toggleTimeout"
								active-color="#13ce66"
								data-test-id="workflow-settings-timeout-workflow"
							></el-switch>
						</div>
					</el-col>
				</el-row>
				<div
					v-if="workflowSettings.executionTimeout > -1"
					data-test-id="workflow-settings-timeout-form"
				>
					<el-row>
						<el-col :span="10" class="setting-name">
							{{ $locale.baseText('workflowSettings.timeoutAfter') + ':' }}
							<n8n-tooltip class="setting-info" placement="top">
								<template #content>
									<div v-text="helpTexts.executionTimeout"></div>
								</template>
								<font-awesome-icon icon="question-circle" />
							</n8n-tooltip>
						</el-col>
						<el-col :span="4">
							<n8n-input
								size="medium"
								:value="timeoutHMS.hours"
								@input="(value) => setTimeout('hours', value)"
								:min="0"
							>
								<template #append>{{ $locale.baseText('workflowSettings.hours') }}</template>
							</n8n-input>
						</el-col>
						<el-col :span="4" class="timeout-input">
							<n8n-input
								size="medium"
								:value="timeoutHMS.minutes"
								@input="(value) => setTimeout('minutes', value)"
								:min="0"
								:max="60"
							>
								<template #append>{{ $locale.baseText('workflowSettings.minutes') }}</template>
							</n8n-input>
						</el-col>
						<el-col :span="4" class="timeout-input">
							<n8n-input
								size="medium"
								:value="timeoutHMS.seconds"
								@input="(value) => setTimeout('seconds', value)"
								:min="0"
								:max="60"
							>
								<template #append>{{ $locale.baseText('workflowSettings.seconds') }}</template>
							</n8n-input>
						</el-col>
					</el-row>
				</div>
			</div>
		</template>
		<template #footer>
			<div class="action-buttons" data-test-id="workflow-settings-save-button">
				<n8n-button
					:label="$locale.baseText('workflowSettings.save')"
					size="large"
					float="right"
					@click="saveSettings"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';

import { externalHooks } from '@/mixins/externalHooks';
import { restApi } from '@/mixins/restApi';
import { genericHelpers } from '@/mixins/genericHelpers';
import { showMessage } from '@/mixins/showMessage';
import {
	ITimeoutHMS,
	IUser,
	IWorkflowDataUpdate,
	IWorkflowDb,
	IWorkflowSettings,
	IWorkflowShortResponse,
	WorkflowCallerPolicyDefaultOption,
} from '@/Interface';
import Modal from './Modal.vue';
import {
	EnterpriseEditionFeature,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WORKFLOW_SETTINGS_MODAL_KEY,
} from '../constants';

import mixins from 'vue-typed-mixins';

import { deepCopy } from 'n8n-workflow';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';
import { useSettingsStore } from '@/stores/settings';
import { useRootStore } from '@/stores/n8nRootStore';
import useWorkflowsEEStore from '@/stores/workflows.ee';
import { useUsersStore } from '@/stores/users';

export default mixins(externalHooks, genericHelpers, restApi, showMessage).extend({
	name: 'WorkflowSettings',
	components: {
		Modal,
	},
	data() {
		return {
			isLoading: true,
			helpTexts: {
				errorWorkflow: this.$locale.baseText('workflowSettings.helpTexts.errorWorkflow'),
				timezone: this.$locale.baseText('workflowSettings.helpTexts.timezone'),
				saveDataErrorExecution: this.$locale.baseText(
					'workflowSettings.helpTexts.saveDataErrorExecution',
				),
				saveDataSuccessExecution: this.$locale.baseText(
					'workflowSettings.helpTexts.saveDataSuccessExecution',
				),
				saveExecutionProgress: this.$locale.baseText(
					'workflowSettings.helpTexts.saveExecutionProgress',
				),
				saveManualExecutions: this.$locale.baseText(
					'workflowSettings.helpTexts.saveManualExecutions',
				),
				executionTimeoutToggle: this.$locale.baseText(
					'workflowSettings.helpTexts.executionTimeoutToggle',
				),
				executionTimeout: this.$locale.baseText('workflowSettings.helpTexts.executionTimeout'),
				workflowCallerPolicy: this.$locale.baseText(
					'workflowSettings.helpTexts.workflowCallerPolicy',
				),
				workflowCallerIds: this.$locale.baseText('workflowSettings.helpTexts.workflowCallerIds'),
			},
			defaultValues: {
				timezone: 'America/New_York',
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				saveExecutionProgress: false,
				saveManualExecutions: false,
				workflowCallerPolicy: 'workflowsFromSameOwner',
			},
			workflowCallerPolicyOptions: [] as Array<{ key: string; value: string }>,
			saveDataErrorExecutionOptions: [] as Array<{ key: string; value: string }>,
			saveDataSuccessExecutionOptions: [] as Array<{ key: string; value: string }>,
			saveExecutionProgressOptions: [] as Array<{ key: string | boolean; value: string }>,
			saveManualOptions: [] as Array<{ key: string | boolean; value: string }>,
			timezones: [] as Array<{ key: string; value: string }>,
			workflowSettings: {} as IWorkflowSettings,
			workflows: [] as IWorkflowShortResponse[],
			executionTimeout: 0,
			maxExecutionTimeout: 0,
			timeoutHMS: { hours: 0, minutes: 0, seconds: 0 } as ITimeoutHMS,
			modalBus: new Vue(),
			WORKFLOW_SETTINGS_MODAL_KEY,
		};
	},

	computed: {
		...mapStores(
			useRootStore,
			useUsersStore,
			useSettingsStore,
			useWorkflowsStore,
			useWorkflowsEEStore,
		),
		workflowName(): string {
			return this.workflowsStore.workflowName;
		},
		workflowId(): string {
			return this.workflowsStore.workflowId;
		},
		workflow(): IWorkflowDb {
			return this.workflowsStore.workflow;
		},
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		isSharingEnabled(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		workflowOwnerName(): string {
			const fallback = this.$locale.baseText(
				'workflowSettings.callerPolicy.options.workflowsFromSameOwner.fallback',
			);

			return this.workflowsEEStore.getWorkflowOwnerName(`${this.workflowId}`, fallback);
		},
	},
	async mounted() {
		this.executionTimeout = this.rootStore.executionTimeout;
		this.maxExecutionTimeout = this.rootStore.maxExecutionTimeout;

		if (!this.workflowId || this.workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			this.$showMessage({
				title: 'No workflow active',
				message: 'No workflow active to display settings of.',
				type: 'error',
				duration: 0,
			});
			this.closeDialog();
			return;
		}

		this.defaultValues.saveDataErrorExecution = this.settingsStore.saveDataErrorExecution;
		this.defaultValues.saveDataSuccessExecution = this.settingsStore.saveDataSuccessExecution;
		this.defaultValues.saveManualExecutions = this.settingsStore.saveManualExecutions;
		this.defaultValues.timezone = this.rootStore.timezone;
		this.defaultValues.workflowCallerPolicy = this.settingsStore.workflowCallerPolicyDefaultOption;

		this.isLoading = true;
		const promises = [];
		promises.push(this.loadWorkflows());
		promises.push(this.loadSaveDataErrorExecutionOptions());
		promises.push(this.loadSaveDataSuccessExecutionOptions());
		promises.push(this.loadSaveExecutionProgressOptions());
		promises.push(this.loadSaveManualOptions());
		promises.push(this.loadTimezones());
		promises.push(this.loadWorkflowCallerPolicyOptions());

		try {
			await Promise.all(promises);
		} catch (error) {
			this.$showError(
				error,
				'Problem loading settings',
				'The following error occurred loading the data:',
			);
		}

		const workflowSettings = deepCopy(this.workflowsStore.workflowSettings) as IWorkflowSettings;

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
			workflowSettings.saveManualExecutions = this.defaultValues.saveManualExecutions;
		}
		if (workflowSettings.callerPolicy === undefined) {
			workflowSettings.callerPolicy = this.defaultValues
				.workflowCallerPolicy as WorkflowCallerPolicyDefaultOption;
		}
		if (workflowSettings.executionTimeout === undefined) {
			workflowSettings.executionTimeout = this.rootStore.executionTimeout;
		}
		if (workflowSettings.maxExecutionTimeout === undefined) {
			workflowSettings.maxExecutionTimeout = this.rootStore.maxExecutionTimeout;
		}

		Vue.set(this, 'workflowSettings', workflowSettings);
		this.timeoutHMS = this.convertToHMS(workflowSettings.executionTimeout);
		this.isLoading = false;

		this.$externalHooks().run('workflowSettings.dialogVisibleChanged', { dialogVisible: true });
		this.$telemetry.track('User opened workflow settings', {
			workflow_id: this.workflowsStore.workflowId,
		});
	},
	methods: {
		onCallerIdsInput(str: string) {
			this.workflowSettings.callerIds = /^[0-9,\s]+$/.test(str)
				? str
				: str.replace(/[^0-9,\s]/g, '');
		},
		closeDialog() {
			this.modalBus.$emit('close');
			this.$externalHooks().run('workflowSettings.dialogVisibleChanged', { dialogVisible: false });
		},
		setTimeout(key: string, value: string) {
			const time = value ? parseInt(value, 10) : 0;

			this.timeoutHMS = {
				...this.timeoutHMS,
				[key]: time,
			};
		},
		async loadWorkflowCallerPolicyOptions() {
			const currentUserIsOwner = this.workflow.ownedBy?.id === this.currentUser?.id;

			this.workflowCallerPolicyOptions = [
				{
					key: 'none',
					value: this.$locale.baseText('workflowSettings.callerPolicy.options.none'),
				},
				{
					key: 'workflowsFromSameOwner',
					value: this.$locale.baseText(
						'workflowSettings.callerPolicy.options.workflowsFromSameOwner',
						{
							interpolate: {
								owner: currentUserIsOwner
									? this.$locale.baseText(
											'workflowSettings.callerPolicy.options.workflowsFromSameOwner.owner',
									  )
									: this.workflowOwnerName,
							},
						},
					),
				},
				{
					key: 'workflowsFromAList',
					value: this.$locale.baseText('workflowSettings.callerPolicy.options.workflowsFromAList'),
				},
				{
					key: 'any',
					value: this.$locale.baseText('workflowSettings.callerPolicy.options.any'),
				},
			];
		},
		async loadSaveDataErrorExecutionOptions() {
			this.saveDataErrorExecutionOptions.length = 0;
			this.saveDataErrorExecutionOptions.push.apply(
				// eslint-disable-line no-useless-call
				this.saveDataErrorExecutionOptions,
				[
					{
						key: 'DEFAULT',
						value: this.$locale.baseText(
							'workflowSettings.saveDataErrorExecutionOptions.defaultSave',
							{
								interpolate: {
									defaultValue:
										this.defaultValues.saveDataErrorExecution === 'all'
											? this.$locale.baseText('workflowSettings.saveDataErrorExecutionOptions.save')
											: this.$locale.baseText(
													'workflowSettings.saveDataErrorExecutionOptions.doNotSave',
											  ),
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
						value: this.$locale.baseText(
							'workflowSettings.saveDataErrorExecutionOptions.doNotSave',
						),
					},
				],
			);
		},
		async loadSaveDataSuccessExecutionOptions() {
			this.saveDataSuccessExecutionOptions.length = 0;
			this.saveDataSuccessExecutionOptions.push.apply(
				// eslint-disable-line no-useless-call
				this.saveDataSuccessExecutionOptions,
				[
					{
						key: 'DEFAULT',
						value: this.$locale.baseText(
							'workflowSettings.saveDataSuccessExecutionOptions.defaultSave',
							{
								interpolate: {
									defaultValue:
										this.defaultValues.saveDataSuccessExecution === 'all'
											? this.$locale.baseText(
													'workflowSettings.saveDataSuccessExecutionOptions.save',
											  )
											: this.$locale.baseText(
													'workflowSettings.saveDataSuccessExecutionOptions.doNotSave',
											  ),
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
						value: this.$locale.baseText(
							'workflowSettings.saveDataSuccessExecutionOptions.doNotSave',
						),
					},
				],
			);
		},
		async loadSaveExecutionProgressOptions() {
			this.saveExecutionProgressOptions.length = 0;
			this.saveExecutionProgressOptions.push.apply(
				// eslint-disable-line no-useless-call
				this.saveExecutionProgressOptions,
				[
					{
						key: 'DEFAULT',
						value: this.$locale.baseText(
							'workflowSettings.saveExecutionProgressOptions.defaultSave',
							{
								interpolate: {
									defaultValue: this.defaultValues.saveExecutionProgress
										? this.$locale.baseText('workflowSettings.saveExecutionProgressOptions.yes')
										: this.$locale.baseText('workflowSettings.saveExecutionProgressOptions.no'),
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
		async loadSaveManualOptions() {
			this.saveManualOptions.length = 0;
			this.saveManualOptions.push({
				key: 'DEFAULT',
				value: this.$locale.baseText('workflowSettings.saveManualOptions.defaultSave', {
					interpolate: {
						defaultValue: this.defaultValues.saveManualExecutions
							? this.$locale.baseText('workflowSettings.saveManualOptions.yes')
							: this.$locale.baseText('workflowSettings.saveManualOptions.no'),
					},
				}),
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

		async loadTimezones() {
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
				value: this.$locale.baseText('workflowSettings.defaultTimezone', {
					interpolate: { defaultTimezoneValue },
				}),
			});
			for (const timezone of Object.keys(timezones)) {
				this.timezones.push({
					key: timezone,
					value: timezones[timezone] as string,
				});
			}
		},
		async loadWorkflows() {
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
		async saveSettings() {
			// Set that the active state should be changed
			const data: IWorkflowDataUpdate = {
				settings: this.workflowSettings,
			};

			// Convert hours, minutes, seconds into seconds for the workflow timeout
			const { hours, minutes, seconds } = this.timeoutHMS;
			data.settings!.executionTimeout =
				data.settings!.executionTimeout !== -1 ? hours * 3600 + minutes * 60 + seconds : -1;

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
				const { hours, minutes, seconds } = this.convertToHMS(
					this.workflowSettings.maxExecutionTimeout as number,
				);
				this.$showError(
					new Error(
						this.$locale.baseText('workflowSettings.showError.saveSettings2.errorMessage', {
							interpolate: {
								hours: hours.toString(),
								minutes: minutes.toString(),
								seconds: seconds.toString(),
							},
						}),
					),
					this.$locale.baseText('workflowSettings.showError.saveSettings2.title'),
					this.$locale.baseText('workflowSettings.showError.saveSettings2.message') + ':',
				);
				return;
			}
			delete data.settings!.maxExecutionTimeout;

			this.isLoading = true;
			data.versionId = this.workflowsStore.workflowVersionId;

			try {
				const workflow = await this.restApi().updateWorkflow(this.$route.params.name, data);
				this.workflowsStore.setWorkflowVersionId(workflow.versionId);
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('workflowSettings.showError.saveSettings3.title'),
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

			const oldSettings = deepCopy(this.workflowsStore.workflowSettings);

			this.workflowsStore.setWorkflowSettings(localWorkflowSettings);

			this.isLoading = false;

			this.$showMessage({
				title: this.$locale.baseText('workflowSettings.showMessage.saveSettings.title'),
				type: 'success',
			});

			this.closeDialog();

			this.$externalHooks().run('workflowSettings.saveSettings', { oldSettings });
			this.$telemetry.track('User updated workflow settings', {
				workflow_id: this.workflowsStore.workflowId,
			});
		},
		toggleTimeout() {
			this.workflowSettings.executionTimeout =
				this.workflowSettings.executionTimeout === -1 ? 0 : -1;
		},
		convertToHMS(num: number): ITimeoutHMS {
			if (num > 0) {
				const hours = Math.floor(num / 3600);
				const remainder = num % 3600;
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
