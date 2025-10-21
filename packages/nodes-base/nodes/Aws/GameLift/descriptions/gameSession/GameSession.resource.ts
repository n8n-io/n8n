import type { INodeProperties } from 'n8n-workflow';
import { handleGameLiftError } from '../../helpers/errorHandler';

export const gameSessionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['gameSession'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a game session',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.CreateGameSession',
						},
					},
					output: {
						postReceive: [handleGameLiftError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe a game session',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.DescribeGameSessions',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'GameSessions',
								},
							},
							handleGameLiftError,
						],
					},
				},
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search game sessions',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.SearchGameSessions',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'GameSessions',
								},
							},
							handleGameLiftError,
						],
					},
				},
			},
		],
	},
];

export const gameSessionFields: INodeProperties[] = [
	{
		displayName: 'Fleet ID',
		name: 'fleetId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['gameSession'],
				operation: ['create', 'describe', 'search'],
			},
		},
		routing: {
			request: {
				body: {
					FleetId: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Maximum Player Session Count',
		name: 'maximumPlayerSessionCount',
		type: 'number',
		required: true,
		default: 10,
		displayOptions: {
			show: {
				resource: ['gameSession'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					MaximumPlayerSessionCount: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Game Session ID',
		name: 'gameSessionId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['gameSession'],
				operation: ['describe'],
			},
		},
		routing: {
			request: {
				body: {
					GameSessionId: '={{ $value }}',
				},
			},
		},
	},
];
