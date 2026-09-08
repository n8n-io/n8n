import type { INodeProperties } from 'n8n-workflow';

import * as click from './click.operation';
import * as fill from './fill.operation';
import * as hover from './hover.operation';
import * as scroll from './scroll.operation';
import * as type from './type.operation';
import { sessionIdField, windowIdField } from '../common/fields';
export { click, fill, hover, scroll, type };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['interaction'],
			},
		},
		options: [
			{
				name: 'Click an element',
				value: 'click',
				description: 'Execute a click on an element given a description',
				action: 'Click an element',
			},
			{
				name: 'Fill form',
				value: 'fill',
				description: 'Fill a form with the provided information',
				action: 'Fill form',
			},
			{
				name: 'Hover on an element',
				value: 'hover',
				description: 'Execute a hover action on an element given a description',
				action: 'Hover on an element',
			},
			{
				name: 'Scroll',
				value: 'scroll',
				description: 'Execute a scroll action on the page',
				action: 'Scroll on page',
			},
			{
				name: 'Type',
				value: 'type',
				description: 'Execute a Type action on an element given a description',
				action: 'Type text',
			},
		],
		default: 'click',
	},
	{
		...sessionIdField,
		displayOptions: {
			show: {
				resource: ['interaction'],
			},
		},
	},
	{
		...windowIdField,
		displayOptions: {
			show: {
				resource: ['interaction'],
			},
		},
	},
	...click.description,
	...fill.description,
	...hover.description,
	...scroll.description,
	...type.description,
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['click', 'hover', 'type', 'scroll'],
			},
		},
		options: [
			{
				displayName: 'Visual scope',
				name: 'visualScope',
				type: 'options',
				default: 'auto',
				description: 'Defines the strategy for visual analysis of the current window',
				options: [
					{
						name: 'Auto',
						description: 'Provides the simplest out-of-the-box experience for most web pages',
						value: 'auto',
					},
					{
						name: 'Viewport',
						description: 'For analysis of the current browser view only',
						value: 'viewport',
					},
					{
						name: 'Page',
						description: 'For analysis of the entire page',
						value: 'page',
					},
					{
						name: 'Scan',
						description:
							"For a full page analysis on sites that have compatibility issues with 'Page' mode",
						value: 'scan',
					},
				],
			},
			{
				displayName: 'Wait until event after navigation',
				name: 'waitForNavigation',
				type: 'options',
				default: 'load',
				description:
					"The condition to wait for the navigation to complete after an interaction (click, type or hover). Defaults to 'Fully loaded'.",
				options: [
					{
						name: 'Fully loaded (slower)',
						value: 'load',
					},
					{
						name: 'DOM only loaded (faster)',
						value: 'domcontentloaded',
					},
					{
						name: 'All network activity has stopped',
						value: 'networkidle0',
					},
					{
						name: 'Most network activity has stopped',
						value: 'networkidle2',
					},
				],
			},
		],
	},
];
