<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from '@/app/composables/useToast';
import type { ITimeoutHMS, IWorkflowSettings, IWorkflowShortResponse } from '@/Interface';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import Modal from '@/app/components/Modal.vue';
import {
	EnterpriseEditionFeature,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WORKFLOW_SETTINGS_MODAL_KEY,
	TIME_SAVED_NODE_EXPERIMENT,
	NODE_CREATOR_OPEN_SOURCES,
	TIME_SAVED_NODE_TYPE,
} from '@/app/constants';
import { N8nButton, N8nIcon, N8nInput, N8nOption, N8nSelect, N8nTooltip } from '@n8n/design-system';
import type { WorkflowSettings } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsEEStore } from '@/app/stores/workflows.ee.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { getResourcePermissions } from '@n8n/permissions';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useDebounce } from '@/app/composables/useDebounce';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import { useGlobalLinkActions } from '@/app/composables/useGlobalLinkActions';
import { usePostHog } from '@/app/stores/posthog.store';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';

import { ElCol, ElRow, ElSwitch } from 'element-plus';

const route = useRoute();
const i18n = useI18n();
const externalHooks = useExternalHooks();
const toast = useToast();
const modalBus = createEventBus();
const telemetry = useTelemetry();
const { isEligibleForMcpAccess, trackMcpAccessEnabledForWorkflow, mcpTriggerMap } = useMcp();
const { registerCustomAction, unregisterCustomAction } = useGlobalLinkActions();

const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const sourceControlStore = useSourceControlStore();
const workflowsStore = useWorkflowsStore();
const workflowState = injectWorkflowState();
const workflowsEEStore = useWorkflowsEEStore();
const posthogStore = usePostHog();
const nodeCreatorStore = useNodeCreatorStore();

const isLoading = ref(true);
const workflowCallerPolicyOptions = ref<Array<{ key: string; value: string }>>([]);
const saveDataErrorExecutionOptions = ref<Array<{ key: string; value: string }>>([]);
const saveDataSuccessExecutionOptions = ref<Array<{ key: string; value: string }>>([]);
const saveExecutionProgressOptions = ref<Array<{ key: string | boolean; value: string }>>([]);
const saveManualOptions = ref<Array<{ key: string | boolean; value: string }>>([]);
const executionOrderOptions = ref<Array<{ key: string; value: string }>>([
	{ key: 'v0', value: 'v0 (legacy)' },
	{ key: 'v1', value: 'v1 (recommended)' },
]);
const timezones = ref<Array<{ key: string; value: string }>>([]);
const workflowSettings = ref<IWorkflowSettings>({} as IWorkflowSettings);
const workflows = ref<IWorkflowShortResponse[]>([]);
const executionTimeout = ref(0);
const maxExecutionTimeout = ref(0);
const timeoutHMS = ref<ITimeoutHMS>({ hours: 0, minutes: 0, seconds: 0 });

const helpTexts = computed(() => ({
	errorWorkflow: i18n.baseText('workflowSettings.helpTexts.errorWorkflow'),
	timezone: i18n.baseText('workflowSettings.helpTexts.timezone'),
	saveDataErrorExecution: i18n.baseText('workflowSettings.helpTexts.saveDataErrorExecution'),
	saveDataSuccessExecution: i18n.baseText('workflowSettings.helpTexts.saveDataSuccessExecution'),
	saveExecutionProgress: i18n.baseText('workflowSettings.helpTexts.saveExecutionProgress'),
	saveManualExecutions: i18n.baseText('workflowSettings.helpTexts.saveManualExecutions'),
	executionTimeoutToggle: i18n.baseText('workflowSettings.helpTexts.executionTimeoutToggle'),
	executionTimeout: i18n.baseText('workflowSettings.helpTexts.executionTimeout'),
	workflowCallerPolicy: i18n.baseText('workflowSettings.helpTexts.workflowCallerPolicy'),
	workflowCallerIds: i18n.baseText('workflowSettings.helpTexts.workflowCallerIds'),
}));

const defaultValues = ref({
	timezone: 'America/New_York',
	saveDataErrorExecution: 'all',
	saveDataSuccessExecution: 'all',
	saveExecutionProgress: false,
	saveManualExecutions: false,
	workflowCallerPolicy: 'workflowsFromSameOwner',
	availableInMCP: false,
});

const isMCPEnabled = computed(
	() => settingsStore.isModuleActive('mcp') && settingsStore.moduleSettings.mcp?.mcpAccessEnabled,
);
const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);
const workflowName = computed(() => workflowsStore.workflowName);
const workflowId = computed(() => workflowsStore.workflowId);
const workflow = computed(() => workflowsStore.getWorkflowById(workflowId.value));
const isSharingEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing],
);
const workflowOwnerName = computed(() => {
	const fallback = i18n.baseText('workflowSettings.callerPolicy.options.workflowsFromSameProject');

	return workflowsEEStore.getWorkflowOwnerName(`${workflowId.value}`, fallback);
});
const workflowPermissions = computed(() => getResourcePermissions(workflow.value?.scopes).workflow);

const mcpToggleDisabled = computed(() => {
	return readOnlyEnv.value || !workflowPermissions.value.update || !isEligibleForMcp.value;
});

const mcpToggleTooltip = computed(() => {
	if (!isEligibleForMcp.value) {
		return i18n.baseText('mcp.workflowNotEligable.description', {
			interpolate: {
				triggers: Object.values(mcpTriggerMap).join(', '),
			},
		});
	}
	return i18n.baseText('workflowSettings.availableInMCP.tooltip');
});

const isEligibleForMcp = computed(() => {
	if (!workflow?.value?.active) return false;
	return isEligibleForMcpAccess(workflow.value);
});

const isTimeSavedNodeExperimentEnabled = computed(() => {
	return posthogStore.isFeatureEnabled(TIME_SAVED_NODE_EXPERIMENT.name);
});

const savedTimeNodes = computed(() => {
	if (!isTimeSavedNodeExperimentEnabled.value) {
		return [];
	}

	if (!workflow?.value?.nodes) return [];
	return workflow.value.nodes.filter(
		(node) => node.type === TIME_SAVED_NODE_TYPE && node.disabled !== true,
	);
});

const hasSavedTimeNodes = computed(() => {
	if (!isTimeSavedNodeExperimentEnabled.value) {
		return false;
	}

	return savedTimeNodes.value.length > 0;
});

const timeSavedModeOptions = computed(() => [
	{
		label: 'Fixed',
		value: 'fixed' as const,
	},
	{
		label: 'Dynamic (node based)',
		value: 'dynamic' as const,
	},
]);

const onCallerIdsInput = (str: string) => {
	workflowSettings.value.callerIds = /^[a-zA-Z0-9,\s]+$/.test(str)
		? str
		: str.replace(/[^a-zA-Z0-9,\s]/g, '');
};

const closeDialog = () => {
	modalBus.emit('close');
	void externalHooks.run('workflowSettings.dialogVisibleChanged', {
		dialogVisible: false,
	});
};

const setTheTimeout = (key: string, value: string) => {
	const time = value ? parseInt(value, 10) : 0;

	timeoutHMS.value = {
		...timeoutHMS.value,
		[key]: time,
	};
};

const loadWorkflowCallerPolicyOptions = async () => {
	workflowCallerPolicyOptions.value = [
		{
			key: 'none',
			value: i18n.baseText('workflowSettings.callerPolicy.options.none'),
		},
		{
			key: 'workflowsFromSameOwner',
			value: i18n.baseText(
				workflow.value.homeProject?.type === ProjectTypes.Personal
					? 'workflowSettings.callerPolicy.options.workflowsFromPersonalProject'
					: 'workflowSettings.callerPolicy.options.workflowsFromTeamProject',
				{
					interpolate: {
						projectName: workflowOwnerName.value,
					},
				},
			),
		},
		{
			key: 'workflowsFromAList',
			value: i18n.baseText('workflowSettings.callerPolicy.options.workflowsFromAList'),
		},
		{
			key: 'any',
			value: i18n.baseText('workflowSettings.callerPolicy.options.any'),
		},
	];
};

const loadSaveDataErrorExecutionOptions = async () => {
	saveDataErrorExecutionOptions.value = [
		{
			key: 'DEFAULT',
			value: i18n.baseText('workflowSettings.saveDataErrorExecutionOptions.defaultSave', {
				interpolate: {
					defaultValue:
						defaultValues.value.saveDataErrorExecution === 'all'
							? i18n.baseText('workflowSettings.saveDataErrorExecutionOptions.save')
							: i18n.baseText('workflowSettings.saveDataErrorExecutionOptions.doNotSave'),
				},
			}),
		},
		{
			key: 'all',
			value: i18n.baseText('workflowSettings.saveDataErrorExecutionOptions.save'),
		},
		{
			key: 'none',
			value: i18n.baseText('workflowSettings.saveDataErrorExecutionOptions.doNotSave'),
		},
	];
};

const loadSaveDataSuccessExecutionOptions = async () => {
	saveDataSuccessExecutionOptions.value = [
		{
			key: 'DEFAULT',
			value: i18n.baseText('workflowSettings.saveDataSuccessExecutionOptions.defaultSave', {
				interpolate: {
					defaultValue:
						defaultValues.value.saveDataSuccessExecution === 'all'
							? i18n.baseText('workflowSettings.saveDataSuccessExecutionOptions.save')
							: i18n.baseText('workflowSettings.saveDataSuccessExecutionOptions.doNotSave'),
				},
			}),
		},
		{
			key: 'all',
			value: i18n.baseText('workflowSettings.saveDataSuccessExecutionOptions.save'),
		},
		{
			key: 'none',
			value: i18n.baseText('workflowSettings.saveDataSuccessExecutionOptions.doNotSave'),
		},
	];
};

const loadSaveExecutionProgressOptions = async () => {
	saveExecutionProgressOptions.value = [
		{
			key: 'DEFAULT',
			value: i18n.baseText('workflowSettings.saveExecutionProgressOptions.defaultSave', {
				interpolate: {
					defaultValue: defaultValues.value.saveExecutionProgress
						? i18n.baseText('workflowSettings.saveExecutionProgressOptions.save')
						: i18n.baseText('workflowSettings.saveExecutionProgressOptions.doNotSave'),
				},
			}),
		},
		{
			key: true,
			value: i18n.baseText('workflowSettings.saveExecutionProgressOptions.save'),
		},
		{
			key: false,
			value: i18n.baseText('workflowSettings.saveExecutionProgressOptions.doNotSave'),
		},
	];
};

const loadSaveManualOptions = async () => {
	saveManualOptions.value = [
		{
			key: 'DEFAULT',
			value: i18n.baseText('workflowSettings.saveManualOptions.defaultSave', {
				interpolate: {
					defaultValue: defaultValues.value.saveManualExecutions
						? i18n.baseText('workflowSettings.saveManualOptions.save')
						: i18n.baseText('workflowSettings.saveManualOptions.doNotSave'),
				},
			}),
		},
		{
			key: true,
			value: i18n.baseText('workflowSettings.saveManualOptions.save'),
		},
		{
			key: false,
			value: i18n.baseText('workflowSettings.saveManualOptions.doNotSave'),
		},
	];
};

const loadTimezones = async () => {
	if (timezones.value.length !== 0) {
		// Data got already loaded
		return;
	}

	const timezonesData = await settingsStore.getTimezones();

	let defaultTimezoneValue = timezonesData[defaultValues.value.timezone] as string | undefined;
	if (defaultTimezoneValue === undefined) {
		defaultTimezoneValue = i18n.baseText('workflowSettings.defaultTimezoneNotValid');
	}

	timezones.value.push({
		key: 'DEFAULT',
		value: i18n.baseText('workflowSettings.defaultTimezone', {
			interpolate: { defaultTimezoneValue },
		}),
	});
	for (const timezone of Object.keys(timezonesData)) {
		timezones.value.push({
			key: timezone,
			value: timezonesData[timezone] as string,
		});
	}
};

const loadWorkflows = async (searchTerm?: string) => {
	const workflowsData = (await workflowsStore.searchWorkflows({
		query: searchTerm,
		isArchived: false,
	})) as IWorkflowShortResponse[];
	workflowsData.sort((a, b) => {
		if (a.name.toLowerCase() < b.name.toLowerCase()) {
			return -1;
		}
		if (a.name.toLowerCase() > b.name.toLowerCase()) {
			return 1;
		}
		return 0;
	});

	workflowsData.unshift({
		id: undefined as unknown as string,
		name: i18n.baseText('workflowSettings.noWorkflow'),
	} as IWorkflowShortResponse);

	workflows.value = workflowsData;
};

const { debounce } = useDebounce();
const debouncedLoadWorkflows = debounce(loadWorkflows, { debounceTime: 300, trailing: true });

const convertToHMS = (num: number): ITimeoutHMS => {
	if (num > 0) {
		const hours = Math.floor(num / 3600);
		const remainder = num % 3600;
		const minutes = Math.floor(remainder / 60);
		const seconds = remainder % 60;
		return { hours, minutes, seconds };
	}
	return { hours: 0, minutes: 0, seconds: 0 };
};

const saveSettings = async () => {
	// Set that the active state should be changed
	const data: WorkflowDataUpdate & { settings: IWorkflowSettings } = {
		settings: workflowSettings.value,
	};

	// Convert hours, minutes, seconds into seconds for the workflow timeout
	const { hours, minutes, seconds } = timeoutHMS.value;
	data.settings.executionTimeout =
		data.settings.executionTimeout !== -1 ? hours * 3600 + minutes * 60 + seconds : -1;

	if (data.settings.executionTimeout === 0) {
		toast.showError(
			new Error(i18n.baseText('workflowSettings.showError.saveSettings1.errorMessage')),
			i18n.baseText('workflowSettings.showError.saveSettings1.title'),
			i18n.baseText('workflowSettings.showError.saveSettings1.message') + ':',
		);
		return;
	}

	if (
		workflowSettings.value?.maxExecutionTimeout &&
		data.settings.executionTimeout > workflowSettings.value?.maxExecutionTimeout
	) {
		const convertedMaxExecutionTimeout = convertToHMS(workflowSettings.value.maxExecutionTimeout);
		toast.showError(
			new Error(
				i18n.baseText('workflowSettings.showError.saveSettings2.errorMessage', {
					interpolate: {
						hours: convertedMaxExecutionTimeout.hours.toString(),
						minutes: convertedMaxExecutionTimeout.minutes.toString(),
						seconds: convertedMaxExecutionTimeout.seconds.toString(),
					},
				}),
			),
			i18n.baseText('workflowSettings.showError.saveSettings2.title'),
			i18n.baseText('workflowSettings.showError.saveSettings2.message') + ':',
		);
		return;
	}
	delete data.settings.maxExecutionTimeout;

	isLoading.value = true;
	data.versionId = workflowsStore.workflowVersionId;

	try {
		const workflowData = await workflowsStore.updateWorkflow(String(route.params.name), data);
		workflowsStore.setWorkflowVersionId(workflowData.versionId);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowSettings.showError.saveSettings3.title'));
		isLoading.value = false;
		return;
	}

	// Get the settings without the defaults set for local workflow settings
	const localWorkflowSettings = Object.fromEntries(
		Object.entries(workflowSettings.value).filter(([, value]) => value !== 'DEFAULT'),
	);

	const oldSettings = deepCopy(workflowsStore.workflowSettings);

	workflowState.setWorkflowSettings(localWorkflowSettings);

	isLoading.value = false;

	toast.showMessage({
		title: i18n.baseText('workflowSettings.showMessage.saveSettings.title'),
		type: 'success',
	});

	closeDialog();

	void externalHooks.run('workflowSettings.saveSettings', { oldSettings });
	telemetry.track('User updated workflow settings', {
		workflow_id: workflowsStore.workflowId,
		// null and undefined values are removed from the object, but we need the keys to be there
		time_saved: workflowSettings.value.timeSavedPerExecution ?? '',
		error_workflow: workflowSettings.value.errorWorkflow ?? '',
	});

	if (isMCPEnabled.value && workflowSettings.value.availableInMCP) {
		trackMcpAccessEnabledForWorkflow(workflowId.value);
	}
};

const toggleTimeout = () => {
	workflowSettings.value.executionTimeout = workflowSettings.value.executionTimeout === -1 ? 0 : -1;
};

const toggleAvailableInMCP = () => {
	workflowSettings.value.availableInMCP = !workflowSettings.value.availableInMCP;
};

const updateTimeSavedPerExecution = (value: string) => {
	const numValue = parseInt(value, 10);
	workflowSettings.value.timeSavedPerExecution = isNaN(numValue)
		? undefined
		: numValue < 0
			? 0
			: numValue;
};

onMounted(async () => {
	executionTimeout.value = rootStore.executionTimeout;
	maxExecutionTimeout.value = rootStore.maxExecutionTimeout;

	if (!workflowId.value || workflowId.value === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
		toast.showMessage({
			title: 'No workflow active',
			message: 'No workflow active to display settings of.',
			type: 'error',
			duration: 0,
		});
		closeDialog();
		return;
	}

	defaultValues.value.saveDataErrorExecution = settingsStore.saveDataErrorExecution;
	defaultValues.value.saveDataSuccessExecution = settingsStore.saveDataSuccessExecution;
	defaultValues.value.saveManualExecutions = settingsStore.saveManualExecutions;
	defaultValues.value.saveExecutionProgress = settingsStore.saveDataProgressExecution;
	defaultValues.value.timezone = rootStore.timezone;
	defaultValues.value.workflowCallerPolicy = settingsStore.workflowCallerPolicyDefaultOption;

	isLoading.value = true;

	try {
		await Promise.all([
			loadWorkflows(),
			loadSaveDataErrorExecutionOptions(),
			loadSaveDataSuccessExecutionOptions(),
			loadSaveExecutionProgressOptions(),
			loadSaveManualOptions(),
			loadTimezones(),
			loadWorkflowCallerPolicyOptions(),
		]);
	} catch (error) {
		toast.showError(
			error,
			'Problem loading settings',
			'The following error occurred loading the data:',
		);
	}

	const workflowSettingsData = deepCopy(workflowsStore.workflowSettings);

	if (workflowSettingsData.timeSavedMode === undefined) {
		workflowSettingsData.timeSavedMode = 'fixed';
	}
	if (workflowSettingsData.timezone === undefined) {
		workflowSettingsData.timezone = 'DEFAULT';
	}
	if (workflowSettingsData.saveDataErrorExecution === undefined) {
		workflowSettingsData.saveDataErrorExecution = 'DEFAULT';
	}
	if (workflowSettingsData.saveDataSuccessExecution === undefined) {
		workflowSettingsData.saveDataSuccessExecution = 'DEFAULT';
	}
	if (workflowSettingsData.saveExecutionProgress === undefined) {
		workflowSettingsData.saveExecutionProgress = 'DEFAULT';
	}
	if (workflowSettingsData.saveManualExecutions === undefined) {
		workflowSettingsData.saveManualExecutions = 'DEFAULT';
	}
	if (workflowSettingsData.callerPolicy === undefined) {
		workflowSettingsData.callerPolicy = defaultValues.value
			.workflowCallerPolicy as WorkflowSettings.CallerPolicy;
	}
	if (workflowSettingsData.executionTimeout === undefined) {
		workflowSettingsData.executionTimeout = rootStore.executionTimeout;
	}
	if (workflowSettingsData.maxExecutionTimeout === undefined) {
		workflowSettingsData.maxExecutionTimeout = rootStore.maxExecutionTimeout;
	}
	if (workflowSettingsData.executionOrder === undefined) {
		workflowSettingsData.executionOrder = 'v0';
	}
	if (workflowSettingsData.availableInMCP === undefined) {
		workflowSettingsData.availableInMCP = defaultValues.value.availableInMCP;
	}

	workflowSettings.value = workflowSettingsData;
	timeoutHMS.value = convertToHMS(workflowSettingsData.executionTimeout);
	isLoading.value = false;

	void externalHooks.run('workflowSettings.dialogVisibleChanged', {
		dialogVisible: true,
	});
	telemetry.track('User opened workflow settings', {
		workflow_id: workflowsStore.workflowId,
	});

	// Register custom action for opening SavedTime node creator
	registerCustomAction({
		key: 'openSavedTimeNodeCreator',
		action: () => {
			// Close the workflow settings modal
			closeDialog();
			// Open node creator for regular nodes
			nodeCreatorStore.openNodeCreatorForRegularNodes(
				NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
			);
		},
	});
});

onBeforeUnmount(() => {
	debouncedLoadWorkflows.cancel?.();
	unregisterCustomAction('openSavedTimeNodeCreator');
});
</script>

<template>
	<Modal
		:name="WORKFLOW_SETTINGS_MODAL_KEY"
		width="65%"
		max-height="80%"
		:title="
			i18n.baseText('workflowSettings.settingsFor', {
				interpolate: { workflowName, workflowId },
			})
		"
		:event-bus="modalBus"
		:scrollable="true"
	>
		<template #content>
			<div
				v-loading="isLoading"
				:class="$style['workflow-settings']"
				data-test-id="workflow-settings-dialog"
			>
				<ElRow>
					<ElCol :span="10" :class="$style['setting-name']">
						{{ i18n.baseText('workflowSettings.executionOrder') }}
					</ElCol>
					<ElCol :span="14" class="ignore-key-press-canvas">
						<N8nSelect
							v-model="workflowSettings.executionOrder"
							placeholder="Select Execution Order"
							size="medium"
							filterable
							:disabled="readOnlyEnv || !workflowPermissions.update"
							:limit-popper-width="true"
							data-test-id="workflow-settings-execution-order"
						>
							<N8nOption
								v-for="option in executionOrderOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key"
							>
							</N8nOption>
						</N8nSelect>
					</ElCol>
				</ElRow>

				<ElRow data-test-id="error-workflow">
					<ElCol :span="10" :class="$style['setting-name']">
						{{ i18n.baseText('workflowSettings.errorWorkflow') }}
						<N8nTooltip placement="top">
							<template #content>
								<div v-n8n-html="helpTexts.errorWorkflow"></div>
							</template>
							<N8nIcon icon="circle-help" />
						</N8nTooltip>
					</ElCol>
					<ElCol :span="14" class="ignore-key-press-canvas">
						<N8nSelect
							v-model="workflowSettings.errorWorkflow"
							placeholder="Select Workflow"
							filterable
							remote
							:remote-method="debouncedLoadWorkflows"
							remote-show-suffix
							:disabled="readOnlyEnv || !workflowPermissions.update"
							:limit-popper-width="true"
							data-test-id="workflow-settings-error-workflow"
						>
							<N8nOption
								v-for="item in workflows"
								:key="item.id"
								:label="item.name"
								:value="item.id"
							>
							</N8nOption>
						</N8nSelect>
					</ElCol>
				</ElRow>
				<div v-if="isSharingEnabled" data-test-id="workflow-caller-policy">
					<ElRow>
						<ElCol :span="10" :class="$style['setting-name']">
							{{ i18n.baseText('workflowSettings.callerPolicy') }}
							<N8nTooltip placement="top">
								<template #content>
									<div v-text="helpTexts.workflowCallerPolicy"></div>
								</template>
								<N8nIcon icon="circle-help" />
							</N8nTooltip>
						</ElCol>

						<ElCol :span="14" class="ignore-key-press-canvas">
							<N8nSelect
								v-model="workflowSettings.callerPolicy"
								:disabled="readOnlyEnv || !workflowPermissions.update"
								:placeholder="i18n.baseText('workflowSettings.selectOption')"
								filterable
								:limit-popper-width="true"
							>
								<N8nOption
									v-for="option of workflowCallerPolicyOptions"
									:key="option.key"
									:label="option.value"
									:value="option.key"
								>
								</N8nOption>
							</N8nSelect>
						</ElCol>
					</ElRow>
					<ElRow v-if="workflowSettings.callerPolicy === 'workflowsFromAList'">
						<ElCol :span="10" :class="$style['setting-name']">
							{{ i18n.baseText('workflowSettings.callerIds') }}
							<N8nTooltip placement="top">
								<template #content>
									<div v-text="helpTexts.workflowCallerIds"></div>
								</template>
								<N8nIcon icon="circle-help" />
							</N8nTooltip>
						</ElCol>
						<ElCol :span="14">
							<N8nInput
								v-model="workflowSettings.callerIds"
								:disabled="readOnlyEnv || !workflowPermissions.update"
								:placeholder="i18n.baseText('workflowSettings.callerIds.placeholder')"
								type="text"
								data-test-id="workflow-caller-policy-workflow-ids"
								@update:model-value="onCallerIdsInput"
							/>
						</ElCol>
					</ElRow>
				</div>
				<ElRow>
					<ElCol :span="10" :class="$style['setting-name']">
						{{ i18n.baseText('workflowSettings.timezone') }}
						<N8nTooltip placement="top">
							<template #content>
								<div v-text="helpTexts.timezone"></div>
							</template>
							<N8nIcon icon="circle-help" />
						</N8nTooltip>
					</ElCol>
					<ElCol :span="14" class="ignore-key-press-canvas">
						<N8nSelect
							v-model="workflowSettings.timezone"
							placeholder="Select Timezone"
							filterable
							:disabled="readOnlyEnv || !workflowPermissions.update"
							:limit-popper-width="true"
							data-test-id="workflow-settings-timezone"
						>
							<N8nOption
								v-for="timezone of timezones"
								:key="timezone.key"
								:label="timezone.value"
								:value="timezone.key"
							>
							</N8nOption>
						</N8nSelect>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="10" :class="$style['setting-name']">
						{{ i18n.baseText('workflowSettings.saveDataErrorExecution') }}
						<N8nTooltip placement="top">
							<template #content>
								<div v-text="helpTexts.saveDataErrorExecution"></div>
							</template>
							<N8nIcon icon="circle-help" />
						</N8nTooltip>
					</ElCol>
					<ElCol :span="14" class="ignore-key-press-canvas">
						<N8nSelect
							v-model="workflowSettings.saveDataErrorExecution"
							:placeholder="i18n.baseText('workflowSettings.selectOption')"
							filterable
							:disabled="readOnlyEnv || !workflowPermissions.update"
							:limit-popper-width="true"
							data-test-id="workflow-settings-save-failed-executions"
						>
							<N8nOption
								v-for="option of saveDataErrorExecutionOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key"
							>
							</N8nOption>
						</N8nSelect>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="10" :class="$style['setting-name']">
						{{ i18n.baseText('workflowSettings.saveDataSuccessExecution') }}
						<N8nTooltip placement="top">
							<template #content>
								<div v-text="helpTexts.saveDataSuccessExecution"></div>
							</template>
							<N8nIcon icon="circle-help" />
						</N8nTooltip>
					</ElCol>
					<ElCol :span="14" class="ignore-key-press-canvas">
						<N8nSelect
							v-model="workflowSettings.saveDataSuccessExecution"
							:placeholder="i18n.baseText('workflowSettings.selectOption')"
							filterable
							:disabled="readOnlyEnv || !workflowPermissions.update"
							:limit-popper-width="true"
							data-test-id="workflow-settings-save-success-executions"
						>
							<N8nOption
								v-for="option of saveDataSuccessExecutionOptions"
								:key="option.key"
								:label="option.value"
								:value="option.key"
							>
							</N8nOption>
						</N8nSelect>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="10" :class="$style['setting-name']">
						{{ i18n.baseText('workflowSettings.saveManualExecutions') }}
						<N8nTooltip placement="top">
							<template #content>
								<div v-text="helpTexts.saveManualExecutions"></div>
							</template>
							<N8nIcon icon="circle-help" />
						</N8nTooltip>
					</ElCol>
					<ElCol :span="14" class="ignore-key-press-canvas">
						<N8nSelect
							v-model="workflowSettings.saveManualExecutions"
							:placeholder="i18n.baseText('workflowSettings.selectOption')"
							filterable
							:disabled="readOnlyEnv || !workflowPermissions.update"
							:limit-popper-width="true"
							data-test-id="workflow-settings-save-manual-executions"
						>
							<N8nOption
								v-for="option of saveManualOptions"
								:key="`${option.key}`"
								:label="option.value"
								:value="option.key"
							>
							</N8nOption>
						</N8nSelect>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="10" :class="$style['setting-name']">
						{{ i18n.baseText('workflowSettings.saveExecutionProgress') }}
						<N8nTooltip placement="top">
							<template #content>
								<div v-text="helpTexts.saveExecutionProgress"></div>
							</template>
							<N8nIcon icon="circle-help" />
						</N8nTooltip>
					</ElCol>
					<ElCol :span="14" class="ignore-key-press-canvas">
						<N8nSelect
							v-model="workflowSettings.saveExecutionProgress"
							:placeholder="i18n.baseText('workflowSettings.selectOption')"
							filterable
							:disabled="readOnlyEnv || !workflowPermissions.update"
							:limit-popper-width="true"
							data-test-id="workflow-settings-save-execution-progress"
						>
							<N8nOption
								v-for="option of saveExecutionProgressOptions"
								:key="`${option.key}`"
								:label="option.value"
								:value="option.key"
							>
							</N8nOption>
						</N8nSelect>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="10" :class="$style['setting-name']">
						{{ i18n.baseText('workflowSettings.timeoutWorkflow') }}
						<N8nTooltip placement="top">
							<template #content>
								<div v-text="helpTexts.executionTimeoutToggle"></div>
							</template>
							<N8nIcon icon="circle-help" />
						</N8nTooltip>
					</ElCol>
					<ElCol :span="14">
						<div>
							<ElSwitch
								ref="inputField"
								:disabled="readOnlyEnv || !workflowPermissions.update"
								:model-value="(workflowSettings.executionTimeout ?? -1) > -1"
								data-test-id="workflow-settings-timeout-workflow"
								@update:model-value="toggleTimeout"
							></ElSwitch>
						</div>
					</ElCol>
				</ElRow>
				<div
					v-if="(workflowSettings.executionTimeout ?? -1) > -1"
					data-test-id="workflow-settings-timeout-form"
				>
					<ElRow>
						<ElCol :span="10" :class="$style['setting-name']">
							{{ i18n.baseText('workflowSettings.timeoutAfter') }}
							<N8nTooltip placement="top">
								<template #content>
									<div v-text="helpTexts.executionTimeout"></div>
								</template>
								<N8nIcon icon="circle-help" />
							</N8nTooltip>
						</ElCol>
						<ElCol :span="4">
							<N8nInput
								:disabled="readOnlyEnv || !workflowPermissions.update"
								:model-value="timeoutHMS.hours"
								:min="0"
								@update:model-value="(value: string) => setTheTimeout('hours', value)"
							>
								<template #append>{{ i18n.baseText('workflowSettings.hours') }}</template>
							</N8nInput>
						</ElCol>
						<ElCol :span="4" :class="$style['timeout-input']">
							<N8nInput
								:disabled="readOnlyEnv || !workflowPermissions.update"
								:model-value="timeoutHMS.minutes"
								:min="0"
								:max="60"
								@update:model-value="(value: string) => setTheTimeout('minutes', value)"
							>
								<template #append>{{ i18n.baseText('workflowSettings.minutes') }}</template>
							</N8nInput>
						</ElCol>
						<ElCol :span="4" :class="$style['timeout-input']">
							<N8nInput
								:disabled="readOnlyEnv || !workflowPermissions.update"
								:model-value="timeoutHMS.seconds"
								:min="0"
								:max="60"
								@update:model-value="(value: string) => setTheTimeout('seconds', value)"
							>
								<template #append>{{ i18n.baseText('workflowSettings.seconds') }}</template>
							</N8nInput>
						</ElCol>
					</ElRow>
				</div>
				<ElRow v-if="isMCPEnabled" data-test-id="workflow-settings-available-in-mcp">
					<ElCol :span="10" :class="$style['setting-name']">
						<label for="availableInMCP">
							{{ i18n.baseText('workflowSettings.availableInMCP') }}
							<N8nTooltip placement="top">
								<template #content>
									{{ mcpToggleTooltip }}
								</template>
								<N8nIcon icon="circle-help" />
							</N8nTooltip>
						</label>
					</ElCol>
					<ElCol :span="14">
						<div>
							<N8nTooltip placement="top" :disabled="!mcpToggleDisabled">
								<template #content>
									{{ mcpToggleTooltip }}
								</template>
								<ElSwitch
									ref="inputField"
									:disabled="mcpToggleDisabled"
									:model-value="workflowSettings.availableInMCP ?? false"
									data-test-id="workflow-settings-available-in-mcp"
									@update:model-value="toggleAvailableInMCP"
								></ElSwitch>
							</N8nTooltip>
						</div>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="10" :class="$style['setting-name']">
						<label for="timeSavedPerExecution">
							{{ i18n.baseText('workflowSettings.timeSavedPerExecution') }}
							<N8nTooltip placement="top">
								<template #content>
									{{ i18n.baseText('workflowSettings.timeSavedPerExecution.tooltip') }}
								</template>
								<N8nIcon icon="circle-help" />
							</N8nTooltip>
						</label>
					</ElCol>
					<ElCol :span="14">
						<div v-if="!isTimeSavedNodeExperimentEnabled" :class="$style['time-saved']">
							<N8nInput
								id="timeSavedPerExecution"
								v-model="workflowSettings.timeSavedPerExecution"
								:disabled="readOnlyEnv || !workflowPermissions.update"
								data-test-id="workflow-settings-time-saved-per-execution"
								type="number"
								min="0"
								@update:model-value="updateTimeSavedPerExecution"
							/>
							<span>{{ i18n.baseText('workflowSettings.timeSavedPerExecution.hint') }}</span>
						</div>
						<div v-else class="ignore-key-press-canvas">
							<N8nSelect
								v-model="workflowSettings.timeSavedMode"
								:disabled="readOnlyEnv || !workflowPermissions.update"
								data-test-id="workflow-settings-time-saved-mode"
								size="medium"
								filterable
								:limit-popper-width="true"
							>
								<N8nOption
									v-for="option in timeSavedModeOptions"
									:key="option.value"
									:label="option.label"
									:value="option.value"
								/>
							</N8nSelect>
						</div>
					</ElCol>
				</ElRow>
				<!-- Fixed mode warning section (only shown in fixed mode when nodes exist) -->
				<ElRow
					v-if="isTimeSavedNodeExperimentEnabled && workflowSettings.timeSavedMode === 'fixed'"
				>
					<ElCol :span="14" :offset="10">
						<div :class="$style['time-saved']">
							<N8nInput
								id="timeSavedPerExecution"
								v-model="workflowSettings.timeSavedPerExecution"
								:disabled="readOnlyEnv || !workflowPermissions.update"
								data-test-id="workflow-settings-time-saved-per-execution"
								type="number"
								min="0"
								@update:model-value="updateTimeSavedPerExecution"
							/>
							<span>{{ i18n.baseText('workflowSettings.timeSavedPerExecution.hint') }}</span>
						</div>
					</ElCol>
				</ElRow>
				<ElRow
					v-if="
						isTimeSavedNodeExperimentEnabled &&
						workflowSettings.timeSavedMode === 'fixed' &&
						hasSavedTimeNodes
					"
				>
					<ElCol :span="14" :offset="10">
						<div :class="$style['time-saved-content']">
							<div :class="$style['time-saved-warning']">
								<span
									v-n8n-html="
										i18n.baseText('workflowSettings.timeSavedPerExecution.fixedTabWarning', {
											interpolate: {
												link: `<a href='#' class='${$style['time-saved-link']}' data-action='openSavedTimeNodeCreator'>${i18n.baseText('workflowSettings.timeSavedPerExecution.fixedTabWarning.link')}</a>`,
											},
										})
									"
								></span>
							</div>
						</div>
					</ElCol>
				</ElRow>
				<!-- Minutes saved section (only shown in fixed mode) -->
				<!-- Active nodes section (only shown in dynamic mode when nodes exist) -->
				<ElRow
					v-if="
						isTimeSavedNodeExperimentEnabled &&
						workflowSettings.timeSavedMode === 'dynamic' &&
						hasSavedTimeNodes
					"
				>
					<ElCol :span="14" :offset="10">
						<div :class="$style['time-saved-content']">
							<div :class="$style['time-saved-nodes-active']">
								<div :class="$style['nodes-active-wrapper']">
									<N8nIcon icon="clock" :class="$style['nodes-active-icon']" />
									<div :class="$style['nodes-active-content']">
										<div :class="$style['nodes-active-title']">
											{{
												i18n.baseText('workflowSettings.timeSavedPerExecution.nodesDetected', {
													interpolate: { count: savedTimeNodes.length },
												})
											}}
										</div>
										<div :class="$style['nodes-active-hint']">
											{{
												i18n.baseText('workflowSettings.timeSavedPerExecution.nodesDetected.hint')
											}}
										</div>
									</div>
								</div>
								<a href="#" :class="$style['add-more-link']" data-action="openSavedTimeNodeCreator">
									{{
										i18n.baseText('workflowSettings.timeSavedPerExecution.nodesDetected.addMore')
									}}
								</a>
							</div>
						</div>
					</ElCol>
				</ElRow>
				<!-- No nodes detected section (only shown in dynamic mode when no nodes) -->
				<ElRow
					v-if="
						isTimeSavedNodeExperimentEnabled &&
						workflowSettings.timeSavedMode === 'dynamic' &&
						!hasSavedTimeNodes
					"
				>
					<ElCol :span="14" :offset="10">
						<div :class="$style['time-saved-content']">
							<div :class="$style['time-saved-no-nodes']">
								<div :class="$style['no-nodes-title']">
									{{ i18n.baseText('workflowSettings.timeSavedPerExecution.noNodesDetected') }}
								</div>
								<div :class="$style['no-nodes-hint']">
									{{ i18n.baseText('workflowSettings.timeSavedPerExecution.noNodesDetected.hint') }}
								</div>
							</div>
						</div>
					</ElCol>
				</ElRow>
			</div>
		</template>
		<template #footer>
			<div :class="$style['action-buttons']" data-test-id="workflow-settings-save-button">
				<N8nButton
					:disabled="readOnlyEnv || !workflowPermissions.update"
					:label="i18n.baseText('workflowSettings.save')"
					size="large"
					float="right"
					@click="saveSettings"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.workflow-settings {
	font-size: var(--font-size--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);

	:global(.el-row) {
		display: flex;
		align-items: center;
	}

	:global(.el-switch) {
		padding: var(--spacing--md) 0;
	}
}

.setting-name {
	&,
	& label {
		display: flex;
		align-items: center;
		gap: var(--spacing--4xs);
	}

	svg {
		display: inline-flex;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	&:hover {
		svg {
			opacity: 1;
		}
	}
}

.timeout-input {
	margin-left: var(--spacing--3xs);
}

.time-saved {
	display: flex;
	align-items: center;

	:global(.el-input) {
		width: var(--spacing--3xl);
	}

	span {
		margin-left: var(--spacing--2xs);
	}
}

.time-saved-dropdown {
	margin-bottom: var(--spacing--sm);
}

.time-saved-tabs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.time-saved-content {
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);
}

.time-saved-input {
	display: flex;
	align-items: center;

	:global(.el-input) {
		width: var(--spacing--3xl);
	}

	span {
		margin-left: var(--spacing--2xs);
	}
}

.time-saved-warning {
	color: var(--color--text);
	line-height: var(--line-height--xl);
}

.time-saved-link {
	color: var(--color--primary);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.time-saved-no-nodes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.no-nodes-title {
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.no-nodes-hint {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.time-saved-nodes-active {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.nodes-active-wrapper {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.nodes-active-icon {
	color: var(--color--primary);
	margin-top: var(--spacing--5xs);
}

.nodes-active-content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
}

.nodes-active-title {
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.nodes-active-hint {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.add-more-link {
	color: var(--color--primary);
	text-decoration: none;
	font-size: var(--font-size--sm);

	&:hover {
		text-decoration: underline;
	}
}
</style>
