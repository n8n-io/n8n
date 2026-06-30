import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { actionFields, actionOperations } from './descriptions/ActionDescription';
import { instanceFields, instanceOperations } from './descriptions/InstanceDescription';
import { projectFields, projectOperations } from './descriptions/ProjectDescription';
import { runFields, runOperations } from './descriptions/RunDescription';
import { signatureFields, signatureOperations } from './descriptions/SignatureDescription';
import { specFileFields, specFileOperations } from './descriptions/SpecFileDescription';
import { testFields, testOperations } from './descriptions/TestDescription';
import { testResultFields, testResultOperations } from './descriptions/TestResultDescription';
import { listSearch } from './methods';

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
		usableAsTool: true,
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
			arrayFormat: 'brackets',
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Action',
						value: 'action',
						description: 'Test action rules (skip, quarantine, tag)',
					},
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
					{
						name: 'Signature',
						value: 'signature',
						description: 'Generate unique test signatures',
					},
					{
						name: 'Spec File',
						value: 'specFile',
						description: 'Spec file performance metrics',
					},
					{
						name: 'Test',
						value: 'test',
						description: 'Individual test performance metrics',
					},
					{
						name: 'Test Result',
						value: 'testResult',
						description: 'Historical test execution results',
					},
				],
				default: 'run',
			},

			// Action
			...actionOperations,
			...actionFields,

			// Instance
			...instanceOperations,
			...instanceFields,

			// Project
			...projectOperations,
			...projectFields,

			// Run
			...runOperations,
			...runFields,

			// Signature
			...signatureOperations,
			...signatureFields,

			// Spec File
			...specFileOperations,
			...specFileFields,

			// Test
			...testOperations,
			...testFields,

			// Test Result
			...testResultOperations,
			...testResultFields,
		],
	};

	methods = {
		listSearch,
	};
}
