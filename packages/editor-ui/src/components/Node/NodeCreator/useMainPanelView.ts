import { getCurrentInstance, computed } from 'vue';
import {
	CORE_NODES_CATEGORY,
	WEBHOOK_NODE_TYPE,
	OTHER_TRIGGER_NODES_SUBCATEGORY,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	REGULAR_NODE_FILTER,
	TRANSFORM_DATA_SUBCATEGORY,
	FILES_SUBCATEGORY,
	FLOWS_CONTROL_SUBCATEGORY,
	HELPERS_SUBCATEGORY,
	TRIGGER_NODE_FILTER,
} from '@/constants';
import { useNodeCreatorStore } from '@/stores/nodeCreator';

export default () => {
	const instance = getCurrentInstance();
	const nodeCreatorStore = useNodeCreatorStore();

	const VIEWS = [
		{
			value: REGULAR_NODE_FILTER,
			title: instance?.proxy.$locale.baseText('nodeCreator.triggerHelperPanel.whatHappensNext'),
			items: [
				{
					key: '*',
					type: 'subcategory',
					properties: {
						subcategory: 'App Regular Nodes',
						icon: 'globe',
					},
				},
				{
					type: 'subcategory',
					key: TRANSFORM_DATA_SUBCATEGORY,
					category: CORE_NODES_CATEGORY,
					properties: {
						subcategory: TRANSFORM_DATA_SUBCATEGORY,
						icon: 'pen',
					},
				},
				{
					type: 'subcategory',
					key: HELPERS_SUBCATEGORY,
					category: CORE_NODES_CATEGORY,
					properties: {
						subcategory: HELPERS_SUBCATEGORY,
						icon: 'toolbox',
					},
				},
				{
					type: 'subcategory',
					key: FLOWS_CONTROL_SUBCATEGORY,
					category: CORE_NODES_CATEGORY,
					properties: {
						subcategory: FLOWS_CONTROL_SUBCATEGORY,
						icon: 'code-branch',
					},
				},
				{
					type: 'subcategory',
					key: FILES_SUBCATEGORY,
					category: CORE_NODES_CATEGORY,
					properties: {
						subcategory: FILES_SUBCATEGORY,
						icon: 'file-alt',
					},
				},
				{
					key: TRIGGER_NODE_FILTER,
					type: 'view',
					properties: {
						title: instance?.proxy.$locale.baseText(
							'nodeCreator.triggerHelperPanel.addAnotherTrigger',
						),
						icon: 'bolt',
						withTopBorder: true,
						description: instance?.proxy.$locale.baseText(
							'nodeCreator.triggerHelperPanel.addAnotherTriggerDescription',
						),
					},
				},
			],
		},
		{
			value: TRIGGER_NODE_FILTER,
			title: instance?.proxy.$locale.baseText('nodeCreator.triggerHelperPanel.selectATrigger'),
			description: instance?.proxy.$locale.baseText(
				'nodeCreator.triggerHelperPanel.selectATriggerDescription',
			),
			items: [
				{
					key: '*',
					type: 'subcategory',
					properties: {
						subcategory: 'App Trigger Nodes',
						icon: 'satellite-dish',
					},
				},
				{
					key: SCHEDULE_TRIGGER_NODE_TYPE,
					type: 'node',
					category: [CORE_NODES_CATEGORY],
					properties: {
						nodeType: {
							group: [],
							name: SCHEDULE_TRIGGER_NODE_TYPE,
							displayName: instance?.proxy.$locale.baseText(
								'nodeCreator.triggerHelperPanel.scheduleTriggerDisplayName',
							),
							description: instance?.proxy.$locale.baseText(
								'nodeCreator.triggerHelperPanel.scheduleTriggerDescription',
							),
							icon: 'fa:clock',
						},
					},
				},
				{
					key: WEBHOOK_NODE_TYPE,
					type: 'node',
					category: [CORE_NODES_CATEGORY],
					properties: {
						nodeType: {
							group: [],
							name: WEBHOOK_NODE_TYPE,
							displayName: instance?.proxy.$locale.baseText(
								'nodeCreator.triggerHelperPanel.webhookTriggerDisplayName',
							),
							description: instance?.proxy.$locale.baseText(
								'nodeCreator.triggerHelperPanel.webhookTriggerDescription',
							),
							iconData: {
								type: 'file',
								icon: 'webhook',
								fileBuffer: '/static/webhook-icon.svg',
							},
						},
					},
				},
				{
					key: MANUAL_TRIGGER_NODE_TYPE,
					type: 'node',
					category: [CORE_NODES_CATEGORY],
					properties: {
						nodeType: {
							group: [],
							name: MANUAL_TRIGGER_NODE_TYPE,
							displayName: instance?.proxy.$locale.baseText(
								'nodeCreator.triggerHelperPanel.manualTriggerDisplayName',
							),
							description: instance?.proxy.$locale.baseText(
								'nodeCreator.triggerHelperPanel.manualTriggerDescription',
							),
							icon: 'fa:mouse-pointer',
						},
					},
				},
				{
					key: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
					type: 'node',
					category: [CORE_NODES_CATEGORY],
					properties: {
						nodeType: {
							group: [],
							name: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
							displayName: instance?.proxy.$locale.baseText(
								'nodeCreator.triggerHelperPanel.workflowTriggerDisplayName',
							),
							description: instance?.proxy.$locale.baseText(
								'nodeCreator.triggerHelperPanel.workflowTriggerDescription',
							),
							icon: 'fa:sign-out-alt',
						},
					},
				},
				{
					type: 'subcategory',
					key: OTHER_TRIGGER_NODES_SUBCATEGORY,
					category: CORE_NODES_CATEGORY,
					properties: {
						subcategory: OTHER_TRIGGER_NODES_SUBCATEGORY,
						icon: 'folder-open',
					},
				},
			],
		},
	];

	const activeView = computed(() => {
		return VIEWS.find((v) => v.value === nodeCreatorStore.selectedView) || VIEWS[0];
	});

	return {
		activeView,
	};
};
