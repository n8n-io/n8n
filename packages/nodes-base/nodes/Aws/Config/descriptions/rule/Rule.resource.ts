import type { INodeProperties } from 'n8n-workflow';

export const ruleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['rule'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a config rule',
				action: 'Create a rule',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'StarlingDoveService.PutConfigRule',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a config rule',
				action: 'Delete a rule',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'StarlingDoveService.DeleteConfigRule',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get rule details',
				action: 'Get a rule',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'StarlingDoveService.DescribeConfigRules',
						},
					},
				},
			},
			{
				name: 'Get Compliance',
				value: 'getCompliance',
				description: 'Get rule compliance status',
				action: 'Get compliance',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'StarlingDoveService.DescribeComplianceByConfigRule',
						},
					},
				},
			},
		],
		default: 'create',
	},
];

export const ruleFields: INodeProperties[] = [
	{
		displayName: 'Rule Name',
		name: 'ConfigRuleName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rule'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					ConfigRuleName: '={{ $value }}',
				},
			},
		},
		description: 'The name of the config rule',
	},
	{
		displayName: 'Source Identifier',
		name: 'SourceIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rule'],
				operation: ['create'],
			},
		},
		default: 'REQUIRED_TAGS',
		routing: {
			request: {
				body: {
					ConfigRule: {
						ConfigRuleName: '={{$parameter["ConfigRuleName"]}}',
						Source: {
							Owner: 'AWS',
							SourceIdentifier: '={{ $value }}',
						},
					},
				},
			},
		},
		description: 'AWS managed rule identifier (e.g., REQUIRED_TAGS, ENCRYPTED_VOLUMES)',
	},
	{
		displayName: 'Scope',
		name: 'Scope',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['rule'],
				operation: ['create'],
			},
		},
		default: '{"ComplianceResourceTypes": ["AWS::EC2::Instance"]}',
		routing: {
			request: {
				body: {
					ConfigRule: {
						Scope: '={{ JSON.parse($value) }}',
					},
				},
			},
		},
		description: 'Scope for rule evaluation',
	},
];
