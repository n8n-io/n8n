import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { constructInteractionRequest } from './helpers';
import {
	validateRequiredStringField,
	validateSessionAndWindowId,
	validateAirtopApiResponse,
	validateScrollByAmount,
	validateScrollingMode,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Scroll Mode',
		name: 'scrollingMode',
		type: 'options',
		description: 'Choose the mode of scrolling',
		options: [
			{
				name: 'Automatic',
				value: 'automatic',
				description: 'Describe with natural language the element to scroll to',
			},
			{
				name: 'Manual',
				value: 'manual',
				description: 'Define the direction and amount to scroll by',
			},
		],
		default: 'automatic',
		required: true,
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['scroll'],
			},
		},
	},
	{
		displayName: 'Element Description',
		default: '',
		description: 'A natural language description of the element to scroll to',
		name: 'scrollToElement',
		type: 'string',
		placeholder: 'e.g. the page section titled "Contact Us"',
		required: true,
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['scroll'],
				scrollingMode: ['automatic'],
			},
		},
	},
	{
		displayName: 'Scroll To Edge',
		name: 'scrollToEdge',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Edge Direction',
		description:
			"The direction to scroll to. When 'Scroll By' is defined, 'Scroll To Edge' action will be executed first, then 'Scroll By' action.",
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['scroll'],
				scrollingMode: ['manual'],
			},
		},
		options: [
			{
				displayName: 'Page Edges',
				name: 'edgeValues',
				values: [
					{
						displayName: 'Vertically',
						name: 'yAxis',
						type: 'options',
						default: '',
						options: [
							{
								name: 'Empty',
								value: '',
							},
							{
								name: 'Top',
								value: 'top',
							},
							{
								name: 'Bottom',
								value: 'bottom',
							},
						],
					},
					{
						displayName: 'Horizontally',
						name: 'xAxis',
						type: 'options',
						default: '',
						options: [
							{
								name: 'Empty',
								value: '',
							},
							{
								name: 'Left',
								value: 'left',
							},
							{
								name: 'Right',
								value: 'right',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Scroll By',
		name: 'scrollBy',
		type: 'fixedCollection',
		default: {},
		description:
			"The amount to scroll by. When 'Scroll To Edge' is defined, 'Scroll By' action will be executed after 'Scroll To Edge'.",
		placeholder: 'Add Scroll Amount',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['scroll'],
				scrollingMode: ['manual'],
			},
		},
		options: [
			{
				name: 'scrollValues',
				displayName: 'Scroll Values',
				description: 'The amount in pixels or percentage to scroll by',
				values: [
					{
						displayName: 'Vertically',
						name: 'yAxis',
						type: 'string',
						default: '',
						placeholder: 'e.g. 200px, 50%, -100px',
					},
					{
						displayName: 'Horizontally',
						name: 'xAxis',
						type: 'string',
						default: '',
						placeholder: 'e.g. 50px, 10%, -200px',
					},
				],
			},
		],
	},
	{
		displayName: 'Scrollable Area',
		name: 'scrollWithin',
		type: 'string',
		default: '',
		description: 'Scroll within an element on the page',
		placeholder: 'e.g. the left sidebar',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['scroll'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);

	const scrollingMode = validateScrollingMode.call(this, index);
	const isAutomatic = scrollingMode === 'automatic';

	const scrollToElement = isAutomatic
		? validateRequiredStringField.call(this, index, 'scrollToElement', 'Element Description')
		: '';

	const scrollToEdge = this.getNodeParameter('scrollToEdge.edgeValues', index, {}) as {
		xAxis?: string;
		yAxis?: string;
	};

	const scrollBy = validateScrollByAmount.call(this, index, 'scrollBy.scrollValues');

	const scrollWithin = this.getNodeParameter('scrollWithin', index, '') as string;

	const request: IDataObject = {
		// when scrollingMode is 'Manual'
		...(!isAutomatic ? { scrollToEdge } : {}),
		...(!isAutomatic ? { scrollBy } : {}),
		// when scrollingMode is 'Automatic'
		...(isAutomatic ? { scrollToElement } : {}),
		// when scrollWithin is defined
		...(scrollWithin ? { scrollWithin } : {}),
	};

	const fullRequest = constructInteractionRequest.call(this, index, request);

	const response = await apiRequest.call(
		this,
		'POST',
		`/sessions/${sessionId}/windows/${windowId}/scroll`,
		fullRequest,
	);

	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, windowId, ...response });
}
