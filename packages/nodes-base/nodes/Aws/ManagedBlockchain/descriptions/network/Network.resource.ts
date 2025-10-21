import type { INodeProperties } from 'n8n-workflow';

export const networkOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['network'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a blockchain network',
				action: 'Create a network',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'TaigaWebService.CreateNetwork',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a blockchain network',
				action: 'Delete a network',
				routing: {
					request: {
						method: 'DELETE',
						headers: {
							'X-Amz-Target': 'TaigaWebService.DeleteNetwork',
						},
						url: '=/networks/{{$parameter["networkId"]}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get information about a network',
				action: 'Get a network',
				routing: {
					request: {
						method: 'GET',
						headers: {
							'X-Amz-Target': 'TaigaWebService.GetNetwork',
						},
						url: '=/networks/{{$parameter["networkId"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List blockchain networks',
				action: 'Get many networks',
				routing: {
					request: {
						method: 'GET',
						headers: {
							'X-Amz-Target': 'TaigaWebService.ListNetworks',
						},
						url: '/networks',
					},
				},
			},
		],
		default: 'create',
	},
];

export const networkFields: INodeProperties[] = [
	{
		displayName: 'Network ID',
		name: 'networkId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['network'],
				operation: ['get', 'delete'],
			},
		},
		default: '',
		description: 'The unique identifier of the network',
	},
	{
		displayName: 'Name',
		name: 'Name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['network'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					Name: '={{ $value }}',
				},
			},
		},
		description: 'The name of the network',
	},
	{
		displayName: 'Framework',
		name: 'Framework',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['network'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Hyperledger Fabric',
				value: 'HYPERLEDGER_FABRIC',
			},
			{
				name: 'Ethereum',
				value: 'ETHEREUM',
			},
		],
		default: 'HYPERLEDGER_FABRIC',
		routing: {
			request: {
				body: {
					Framework: '={{ $value }}',
				},
			},
		},
		description: 'The blockchain framework',
	},
	{
		displayName: 'Framework Version',
		name: 'FrameworkVersion',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['network'],
				operation: ['create'],
			},
		},
		default: '2.2',
		routing: {
			request: {
				body: {
					FrameworkVersion: '={{ $value }}',
				},
			},
		},
		description: 'The version of the blockchain framework',
	},
	{
		displayName: 'Voting Policy',
		name: 'VotingPolicy',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['network'],
				operation: ['create'],
			},
		},
		default: '{"ApprovalThresholdPolicy": {"ThresholdPercentage": 50}}',
		routing: {
			request: {
				body: {
					VotingPolicy: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'The voting policy for the network',
	},
	{
		displayName: 'Member Configuration',
		name: 'MemberConfiguration',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['network'],
				operation: ['create'],
			},
		},
		default: '{"Name": "member1", "FrameworkConfiguration": {"Fabric": {"AdminUsername": "admin", "AdminPassword": "Password123"}}}',
		routing: {
			request: {
				body: {
					MemberConfiguration: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'Configuration for the first member of the network',
	},
];
