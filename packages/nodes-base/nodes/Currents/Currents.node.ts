import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { instanceFields, instanceOperations } from './descriptions/InstanceDescription';
import { projectFields, projectOperations } from './descriptions/ProjectDescription';
import { runFields, runOperations } from './descriptions/RunDescription';

export class Currents implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Currents',
		name: 'currents',
		icon: 'file:currents.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Currents API for test orchestration and analytics',
		defaults: {
			name: 'Currents',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'currentsApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.currents.dev/v1',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Instance',
						value: 'instance',
						description: 'Spec file execution instance',
					},
					{
						name: 'Project',
						value: 'project',
						description: 'Test project',
					},
					{
						name: 'Run',
						value: 'run',
						description: 'Test run',
					},
				],
				default: 'run',
			},

			// Project
			...projectOperations,
			...projectFields,

			// Run
			...runOperations,
			...runFields,

			// Instance
			...instanceOperations,
			...instanceFields,
		],
	};
}
