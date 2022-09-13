import { INodeProperties } from 'n8n-workflow';

export const customerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a customer',
				action: 'Create a customer',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a customer',
				action: 'Delete a customer',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a customer',
				action: 'Get a customer',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all customers',
				action: 'Get all customers',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a customer',
				action: 'Update a customer',
			},
		],
		displayOptions: {
			show: {
				resource: ['customer'],
			},
		},
	},
];

export const customerFields: INodeProperties[] = [
	// ----------------------------------
	//       customer: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Full name or business name of the customer to create',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'fixedCollection',
				description: 'Address of the customer to create',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'Line 1',
								name: 'line1',
								description: 'Address line 1 (e.g. street, PO Box, or company name)',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Line 2',
								name: 'line2',
								description: 'Address line 2 (e.g. apartment, suite, unit, or building)',
								type: 'string',
								default: '',
							},
							{
								displayName: 'City',
								name: 'city',
								description: 'City, district, suburb, town, or village',
								type: 'string',
								default: '',
							},
							{
								displayName: 'State',
								name: 'state',
								description: 'State, county, province, or region',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country',
								name: 'country',
								description:
									'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>)',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Postal Code',
								name: 'postal_code',
								description: 'ZIP or postal code',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Arbitrary text to describe the customer to create',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email of the customer to create',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the customer to create',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Metadata Properties',
						name: 'metadataProperties',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Telephone number of the customer to create',
			},
			{
				displayName: 'Shipping',
				name: 'shipping',
				type: 'fixedCollection',
				default: {},
				description: 'Shipping information for the customer',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Shipping Properties',
						name: 'shippingProperties',
						values: [
							{
								displayName: 'Recipient Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Recipient Address',
								name: 'address',
								type: 'fixedCollection',
								default: {},
								placeholder: 'Add Address Details',
								options: [
									{
										displayName: 'Details',
										name: 'details',
										values: [
											{
												displayName: 'Line 1',
												name: 'line1',
												description: 'Address line 1 (e.g. street, PO Box, or company name)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Line 2',
												name: 'line2',
												description: 'Address line 2 (e.g. apartment, suite, unit, or building)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'City',
												name: 'city',
												description: 'City, district, suburb, town, or village',
												type: 'string',
												default: '',
											},
											{
												displayName: 'State',
												name: 'state',
												description: 'State, county, province, or region',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Country',
												name: 'country',
												description:
													'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Postal Code',
												name: 'postal_code',
												description: 'ZIP or postal code',
												type: 'string',
												default: '',
											},
										],
									},
								],
							},
							{
								displayName: 'Recipient Phone',
								name: 'phone',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},

	// ----------------------------------
	//          customer: delete
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer to delete',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//          customer: get
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer to retrieve',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//       customer: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: "Customer's email to filter by",
			},
		],
	},

	// ----------------------------------
	//         customer: update
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer to update',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'fixedCollection',
				description: 'Address of the customer to update',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'Line 1',
								name: 'line1',
								description: 'Address line 1 (e.g. street, PO Box, or company name)',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Line 2',
								name: 'line2',
								description: 'Address line 2 (e.g. apartment, suite, unit, or building)',
								type: 'string',
								default: '',
							},
							{
								displayName: 'City',
								name: 'city',
								description: 'City, district, suburb, town, or village',
								type: 'string',
								default: '',
							},
							{
								displayName: 'State',
								name: 'state',
								description: 'State, county, province, or region',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country',
								name: 'country',
								description:
									'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>)',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Postal Code',
								name: 'postal_code',
								description: 'ZIP or postal code',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Arbitrary text to describe the customer to create',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email of the customer to create',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the customer to create',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Metadata Properties',
						name: 'metadataProperties',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Full name or business name of the customer to create',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Telephone number of this customer',
			},
			{
				displayName: 'Shipping',
				name: 'shipping',
				type: 'fixedCollection',
				description: 'Shipping information for the customer',
				placeholder: 'Add Field',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Shipping Properties',
						name: 'shippingProperties',
						values: [
							{
								displayName: 'Recipient Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the person who will receive the shipment',
							},
							{
								displayName: 'Recipient Address',
								name: 'address',
								type: 'fixedCollection',
								default: {},
								placeholder: 'Add Address Details',
								options: [
									{
										displayName: 'Details',
										name: 'details',
										values: [
											{
												displayName: 'Line 1',
												name: 'line1',
												description: 'Address line 1 (e.g. street, PO Box, or company name)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Line 2',
												name: 'line2',
												description: 'Address line 2 (e.g. apartment, suite, unit, or building)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'City',
												name: 'city',
												description: 'City, district, suburb, town, or village',
												type: 'string',
												default: '',
											},
											{
												displayName: 'State',
												name: 'state',
												description: 'State, county, province, or region',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Country',
												name: 'country',
												description:
													'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>)',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Postal Code',
												name: 'postal_code',
												description: 'ZIP or postal code',
												type: 'string',
												default: '',
											},
										],
									},
								],
							},
							{
								displayName: 'Recipient Phone',
								name: 'phone',
								type: 'string',
								default: '',
								description: 'Phone number of the person who will receive the shipment',
							},
						],
					},
				],
			},
		],
	},
];
