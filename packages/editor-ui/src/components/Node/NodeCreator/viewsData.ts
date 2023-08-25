import {
	CORE_NODES_CATEGORY,
	WEBHOOK_NODE_TYPE,
	OTHER_TRIGGER_NODES_SUBCATEGORY,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	REGULAR_NODE_CREATOR_VIEW,
	TRANSFORM_DATA_SUBCATEGORY,
	FILES_SUBCATEGORY,
	FLOWS_CONTROL_SUBCATEGORY,
	HELPERS_SUBCATEGORY,
	TRIGGER_NODE_CREATOR_VIEW,
	EMAIL_IMAP_NODE_TYPE,
	DEFAULT_SUBCATEGORY,
	AI_SUBCATEGORY,
	AI_NODES_CATEGORY,
	AI_NODE_CREATOR_VIEW,
} from '@/constants';
import { useI18n } from '@/composables';

export function AIView() {
	const i18n = useI18n();

	return {
		value: AI_NODE_CREATOR_VIEW,
		title: i18n.baseText('nodeCreator.aiPanel.selectATrigger'),
		subtitle: i18n.baseText('nodeCreator.aiPanel.selectATriggerDescription'),
		items: [
			{
				key: DEFAULT_SUBCATEGORY,
				type: 'subcategory',
				properties: {
					forceIncludeNodes: [WEBHOOK_NODE_TYPE, EMAIL_IMAP_NODE_TYPE],
					title: 'App Trigger Nodes',
					icon: 'satellite-dish',
				},
			},
			{
				key: SCHEDULE_TRIGGER_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: SCHEDULE_TRIGGER_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.aiPanel.scheduleTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.aiPanel.scheduleTriggerDescription'),
					icon: 'fa:clock',
				},
			},
			{
				key: WEBHOOK_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: WEBHOOK_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.aiPanel.webhookTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.aiPanel.webhookTriggerDescription'),
					iconData: {
						type: 'file',
						icon: 'webhook',
						fileBuffer: '/static/webhook-icon.svg',
					},
				},
			},
			{
				type: 'subcategory',
				key: AI_SUBCATEGORY,
				category: AI_NODES_CATEGORY,
				properties: {
					title: AI_SUBCATEGORY,
					icon: 'brain',
				},
			},
		],
	};
}

export function TriggerView() {
	const i18n = useI18n();

	return {
		value: TRIGGER_NODE_CREATOR_VIEW,
		title: i18n.baseText('nodeCreator.triggerHelperPanel.selectATrigger'),
		subtitle: i18n.baseText('nodeCreator.triggerHelperPanel.selectATriggerDescription'),
		items: [
			{
				key: DEFAULT_SUBCATEGORY,
				type: 'subcategory',
				properties: {
					forceIncludeNodes: [WEBHOOK_NODE_TYPE, EMAIL_IMAP_NODE_TYPE],
					title: 'App Trigger Nodes',
					icon: 'satellite-dish',
				},
			},
			{
				key: SCHEDULE_TRIGGER_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: SCHEDULE_TRIGGER_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.triggerHelperPanel.scheduleTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.triggerHelperPanel.scheduleTriggerDescription'),
					icon: 'fa:clock',
				},
			},
			{
				key: WEBHOOK_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: WEBHOOK_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.triggerHelperPanel.webhookTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.triggerHelperPanel.webhookTriggerDescription'),
					iconData: {
						type: 'file',
						icon: 'webhook',
						fileBuffer: '/static/webhook-icon.svg',
					},
				},
			},
			{
				key: MANUAL_TRIGGER_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: MANUAL_TRIGGER_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.triggerHelperPanel.manualTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.triggerHelperPanel.manualTriggerDescription'),
					icon: 'fa:mouse-pointer',
				},
			},
			{
				key: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				type: 'node',
				category: [CORE_NODES_CATEGORY],
				properties: {
					group: [],
					name: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
					displayName: i18n.baseText('nodeCreator.triggerHelperPanel.workflowTriggerDisplayName'),
					description: i18n.baseText('nodeCreator.triggerHelperPanel.workflowTriggerDescription'),
					icon: 'fa:sign-out-alt',
				},
			},
			{
				type: 'subcategory',
				key: OTHER_TRIGGER_NODES_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: OTHER_TRIGGER_NODES_SUBCATEGORY,
					icon: 'folder-open',
				},
			},
		],
	};
}

export function RegularView() {
	const i18n = useI18n();

	return {
		value: REGULAR_NODE_CREATOR_VIEW,
		title: i18n.baseText('nodeCreator.triggerHelperPanel.whatHappensNext'),
		items: [
			{
				key: DEFAULT_SUBCATEGORY,
				type: 'subcategory',
				properties: {
					title: 'App Regular Nodes',
					icon: 'globe',
				},
			},
			{
				type: 'subcategory',
				key: TRANSFORM_DATA_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: TRANSFORM_DATA_SUBCATEGORY,
					icon: 'pen',
				},
			},
			{
				type: 'subcategory',
				key: HELPERS_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: HELPERS_SUBCATEGORY,
					icon: 'toolbox',
				},
			},
			{
				type: 'subcategory',
				key: FLOWS_CONTROL_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: FLOWS_CONTROL_SUBCATEGORY,
					icon: 'code-branch',
				},
			},
			{
				type: 'subcategory',
				key: FILES_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					title: FILES_SUBCATEGORY,
					icon: 'file-alt',
				},
			},
			{
				key: TRIGGER_NODE_CREATOR_VIEW,
				type: 'view',
				properties: {
					title: i18n.baseText('nodeCreator.triggerHelperPanel.addAnotherTrigger'),
					icon: 'bolt',
					description: i18n.baseText('nodeCreator.triggerHelperPanel.addAnotherTriggerDescription'),
				},
			},
		],
	};
}
