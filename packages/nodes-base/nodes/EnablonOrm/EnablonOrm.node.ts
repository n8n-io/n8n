import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

export class EnablonOrm implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'Enablon ORM',
			name: 'EnablonOrm',
			icon: 'file:enablonOrm.png',
			group: ['input'],
			version: 1,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Enablon ORM API',
			defaults: {
					name: 'EnablonOrm',
					color: '#1A82e2',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'enablonOrmApi',
					required: true,
					displayOptions: {
						show: {
							authentication: [
								'accessToken',
							],
						},
					},
				},
				{
					name: 'enablonOrmOAuth2Api',
					required: true,
					displayOptions: {
						show: {
							authentication: [
								'oAuth2',
							],
						},
					},
				},
			],
			properties: [
				{
					displayName: 'Authentication',
					name: 'authentication',
					type: 'options',
					options: [
						{
							name: 'Access Token',
							value: 'accessToken',
						},
						{
							name: 'OAuth2',
							value: 'oAuth2',
						},
					],
					default: 'accessToken',
					description: 'Means of authenticating with the service.',
				},
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					options: [
						{
							name: 'Permit',
							value: 'permit',
						},
						{
							name: 'Isolation',
							value: 'isolation',
						},
						{
							name: 'Risk Assessment',
							value: 'riskAssessment',
						},
					],
					default: 'permit',
					description: 'The resource to operate on.',
				},

				// ----------------------------------
				//         operations
				// ----------------------------------
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: {
						show: {
							resource: [
								'permit',
							],
						},
					},
					options: [
						{
							name: 'Retrieve high risk permits',
							value: 'retrieveHighRiskPermits',
							description: 'Retrieve High risk permits',
						},
						{
							name: 'Retrieve long term permits',
							value: 'retrieveLongTermPermits',
							description: 'Retrieve long term permits',
						}
					],
					default: 'retrieveHighRiskPermits',
					description: 'The operation to perform.',
				},

				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: {
						show: {
							resource: [
								'isolation',
							],
						},
					},
					options: [
						{
							name: 'Retrieve long term isolations',
							value: 'retrieveLongTermIsolations',
							description: 'Retrieve long terms isolations',
						}
					],
					default: 'retrieveLongTermIsolations',
					description: 'The operation to perform.',
				},

				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: {
						show: {
							resource: [
								'riskAssessment',
							],
						},
					},
					options: [
						{
							name: 'Retrieve risk assessment',
							value: 'retrieveRiskAssessment',
						},
					],
					default: 'retrieveRiskAssessment',
					description: 'The operation to perform.',
				},

				// ----------------------------------
				//         Permit
				// ----------------------------------

				// ----------------------------------
				//         Permit/retrieveData
				// ----------------------------------
				{
					displayName: 'Equipment Tag',
					name: 'equipmentTag',
					type: 'string',
					default: '',
					required: true,
					displayOptions: {
						show: {
							operation: [
								'retrieveHighRiskPermits',
								'retrieveLongTermIsolations'
							],
							resource: [
								'permit',
								'isolation',
							],
						},
					},
					placeholder: 'PUMP-123',
					description: 'The equipment tag number for which you wish to retrieve permits or isolations.',
				},
				{
					displayName: 'Location Name',
					name: 'locationName',
					type: 'string',
					default: '',
					required: true,
					displayOptions: {
						show: {
							operation: [
								'retrieveHighRiskPermits',
								'retrieveLongTermIsolations'
							],
							resource: [
								'permit',
								'isolation',
							],
						},
					},
					placeholder: 'F-15 Upper Deck',
					description: 'The location name where the operational risk is planned.',
				},
			],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			return [[]];
	}
}
