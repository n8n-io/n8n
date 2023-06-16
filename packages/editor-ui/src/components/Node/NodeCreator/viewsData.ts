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
} from '@/constants';

export function TriggerView($locale: any) {
	return {
		value: TRIGGER_NODE_CREATOR_VIEW,
		title: $locale.baseText('nodeCreator.triggerHelperPanel.selectATrigger'),
		subtitle: $locale.baseText('nodeCreator.triggerHelperPanel.selectATriggerDescription'),
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
					displayName: $locale.baseText(
						'nodeCreator.triggerHelperPanel.scheduleTriggerDisplayName',
					),
					description: $locale.baseText(
						'nodeCreator.triggerHelperPanel.scheduleTriggerDescription',
					),
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
					displayName: $locale.baseText('nodeCreator.triggerHelperPanel.webhookTriggerDisplayName'),
					description: $locale.baseText('nodeCreator.triggerHelperPanel.webhookTriggerDescription'),
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
					displayName: $locale.baseText('nodeCreator.triggerHelperPanel.manualTriggerDisplayName'),
					description: $locale.baseText('nodeCreator.triggerHelperPanel.manualTriggerDescription'),
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
					displayName: $locale.baseText(
						'nodeCreator.triggerHelperPanel.workflowTriggerDisplayName',
					),
					description: $locale.baseText(
						'nodeCreator.triggerHelperPanel.workflowTriggerDescription',
					),
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

export function RegularView($locale: any) {
	return {
		value: REGULAR_NODE_CREATOR_VIEW,
		title: $locale.baseText('nodeCreator.triggerHelperPanel.whatHappensNext'),
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
					title: $locale.baseText('nodeCreator.triggerHelperPanel.addAnotherTrigger'),
					icon: 'bolt',
					description: $locale.baseText(
						'nodeCreator.triggerHelperPanel.addAnotherTriggerDescription',
					),
				},
			},
		],
	};
}
