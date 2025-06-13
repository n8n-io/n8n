import type { INodeUi } from '@/Interface';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';

export const TEST_PARAMETERS: INodeProperties[] = [
	{
		displayName: 'Test Fixed Collection',
		name: 'fixedCollectionTest',
		placeholder: 'Test',
		type: 'fixedCollection',
		description:
			'Test fixed collection description. This is a long description that should be wrapped.',
		typeOptions: { multipleValues: true, sortable: true, minRequiredFields: 1 },
		displayOptions: {
			show: { '@version': [{ _cnd: { gte: 1.1 } }] },
		},
		default: {},
		options: [
			{
				name: 'values',
				displayName: 'Values',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. fieldName',
						description: 'A name of the field in the collection',
						required: true,
						noDataExpression: true,
					},
				],
			},
		],
	},
	{
		displayName:
			'Note: This is a notice with <a href="notice.n8n.io" target="_blank">notice link</a>',
		name: 'testNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: { '@version': [{ _cnd: { gte: 1.1 } }] },
		},
	},
	{
		displayName:
			'Tip: This is a callout with <a href="callout.n8n.io" target="_blank">callout link</a>',
		name: 'testCallout',
		type: 'callout',
		default: '',
		displayOptions: {
			show: { '@version': [{ _cnd: { gte: 1.1 } }] },
		},
		typeOptions: {
			calloutAction: {
				label: 'and action!',
				type: 'openRagStarterTemplate',
			},
		},
	},
];

export const FIXED_COLLECTION_PARAMETERS: INodeProperties[] = TEST_PARAMETERS.filter(
	(p) => p.type === 'fixedCollection',
);

export const TEST_NODE_VALUES: INodeParameters = {
	color: '#ff0000',
	alwaysOutputData: false,
	executeOnce: false,
	notesInFlow: false,
	onError: 'stopWorkflow',
	retryOnFail: false,
	maxTries: 3,
	waitBetweenTries: 1000,
	notes: '',
	parameters: { fixedCollectionTest: {} },
};

export const TEST_NODE_NO_ISSUES: INodeUi = {
	id: 'test-123',
	parameters: { fixedCollectionTest: { values: [{ name: 'firstName' }] } },
	typeVersion: 1.1,
	name: 'Test Node',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	position: [260, 340],
};

export const TEST_ISSUE = 'At least 1 field is required.';

export const TEST_NODE_WITH_ISSUES: INodeUi = {
	...TEST_NODE_NO_ISSUES,
	parameters: { fixedCollectionTest: {} },
	issues: { parameters: { fixedCollectionTest: [TEST_ISSUE] } },
};
