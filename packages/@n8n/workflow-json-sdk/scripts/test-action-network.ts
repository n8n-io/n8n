import { convertNodeToTypes, type NodeTypeDefinition } from './generateTypes';

// Action Network node definition
const actionNetworkNode: NodeTypeDefinition = {
	displayName: 'Action Network',
	name: 'n8n-nodes-base.actionNetwork',
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [
				{ name: 'Attendance', value: 'attendance' },
				{ name: 'Event', value: 'event' },
				{ name: 'Person', value: 'person' },
			],
			default: 'attendance',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			displayOptions: {
				show: { resource: ['person'] },
			},
			options: [
				{ name: 'Create', value: 'create' },
				{ name: 'Get', value: 'get' },
				{ name: 'Update', value: 'update' },
			],
			default: 'create',
		},
		{
			displayName: 'Email Address',
			name: 'email_addresses',
			type: 'fixedCollection',
			default: {},
			description: "Person's email addresses",
			displayOptions: {
				show: {
					resource: ['person'],
					operation: ['create'],
				},
			},
			options: [
				{
					name: 'Email Addresses Fields',
					value: 'email_addresses_fields',
					values: [
						{
							displayName: 'Address',
							name: 'address',
							type: 'string',
							default: '',
							description: "Person's email address",
						},
						{
							displayName: 'Primary',
							name: 'primary',
							type: 'boolean',
							default: true,
							description: "Whether this is the person's primary email address",
						},
						{
							displayName: 'Status',
							name: 'status',
							type: 'options',
							default: 'subscribed',
							description: 'Subscription status of this email address',
							options: [
								{ name: 'Bouncing', value: 'bouncing' },
								{ name: 'Subscribed', value: 'subscribed' },
								{ name: 'Unsubscribed', value: 'unsubscribed' },
							],
						},
					],
				},
			],
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			default: {},
			displayOptions: {
				show: {
					resource: ['person'],
					operation: ['create'],
				},
			},
			options: [
				{
					name: 'Family Name',
					value: 'family_name',
					description: "Person's last name",
				},
				{
					name: 'Given Name',
					value: 'given_name',
					description: "Person's first name",
				},
				{
					name: 'Postal Addresses',
					value: 'postal_addresses',
					values: [
						{
							displayName: 'Address Line',
							name: 'address_lines',
							type: 'string',
							default: '',
							description: "Line for a person's address",
						},
						{
							displayName: 'Postal Code',
							name: 'postal_code',
							type: 'string',
							default: '',
							description: 'Region specific postal code, such as ZIP code',
						},
						{
							displayName: 'Location',
							name: 'location',
							type: 'fixedCollection',
							default: {},
							options: [
								{
									name: 'Location Fields',
									value: 'location_fields',
									values: [
										{
											displayName: 'Latitude',
											name: 'latitude',
											type: 'string',
											default: '',
											description: 'Latitude of the location of the address',
										},
										{
											displayName: 'Longitude',
											name: 'longitude',
											type: 'string',
											default: '',
											description: 'Longitude of the location of the address',
										},
									],
								},
							],
						},
					],
				},
			],
		},
		{
			displayName: 'Simplify',
			name: 'simple',
			type: 'boolean',
			displayOptions: {
				show: {
					resource: ['person'],
					operation: ['create'],
				},
			},
			default: true,
			description: 'Whether to return a simplified version of the response instead of the raw data',
		},
	],
};

// Generate types
const generatedTypes = convertNodeToTypes([actionNetworkNode]);

console.log('='.repeat(80));
console.log('GENERATED TYPES FOR ACTION NETWORK NODE');
console.log('='.repeat(80));
console.log(generatedTypes);
console.log('='.repeat(80));
