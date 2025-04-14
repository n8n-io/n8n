import { NodeConnectionTypes } from 'n8n-workflow';
import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';

import * as extraction from './actions/extraction/Extraction.resource';
import * as interaction from './actions/interaction/Interaction.resource';
import { router } from './actions/router';
import * as session from './actions/session/Session.resource';
import * as window from './actions/window/Window.resource';
export class Airtop implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Airtop',
		name: 'airtop',
		icon: 'file:airtop.svg',
		group: ['transform'],
		defaultVersion: 1,
		version: [1],
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Scrape and control any site with Airtop',
		usableAsTool: true,
		defaults: {
			name: 'Airtop',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'airtopApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Session',
						value: 'session',
					},
					{
						name: 'Window',
						value: 'window',
					},
					{
						name: 'Extraction',
						value: 'extraction',
					},
					{
						name: 'Interaction',
						value: 'interaction',
					},
				],
				default: 'session',
			},
			...session.description,
			...window.description,
			...extraction.description,
			...interaction.description,
		],
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
