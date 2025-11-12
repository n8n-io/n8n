import { convertNodeToTypes, NodeTypeDefinition } from './generateTypes';

describe('Integration tests', () => {
	it('should generate types for full Action Network node with all resources', async () => {
		const nodes: NodeTypeDefinition[] = [
			{
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
							{ name: 'Person Tag', value: 'personTag' },
							{ name: 'Petition', value: 'petition' },
							{ name: 'Signature', value: 'signature' },
							{ name: 'Tag', value: 'tag' },
						],
						default: 'attendance',
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						displayOptions: {
							show: { resource: ['attendance'] },
						},
						options: [
							{ name: 'Create', value: 'create' },
							{ name: 'Get', value: 'get' },
							{ name: 'Get Many', value: 'getAll' },
						],
						default: 'create',
					},
					{
						displayName: 'Person ID',
						name: 'personId',
						description: 'ID of the person to create an attendance for',
						type: 'string',
						default: '',
						required: true,
						displayOptions: {
							show: { resource: ['attendance'], operation: ['create'] },
						},
					},
					{
						displayName: 'Event ID',
						name: 'eventId',
						description: 'ID of the event to create an attendance for',
						type: 'string',
						default: '',
						required: true,
						displayOptions: {
							show: { resource: ['attendance'], operation: ['create'] },
						},
					},
					{
						displayName: 'Simplify',
						name: 'simple',
						type: 'boolean',
						displayOptions: {
							show: { resource: ['attendance'], operation: ['create'] },
						},
						default: true,
						description:
							'Whether to return a simplified version of the response instead of the raw data',
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						displayOptions: {
							show: { resource: ['event'] },
						},
						options: [
							{ name: 'Create', value: 'create' },
							{ name: 'Get', value: 'get' },
							{ name: 'Get Many', value: 'getAll' },
						],
						default: 'create',
					},
					{
						displayName: 'Origin System',
						name: 'originSystem',
						description: 'Source where the event originated',
						type: 'string',
						required: true,
						default: '',
						displayOptions: {
							show: { resource: ['event'], operation: ['create'] },
						},
					},
					{
						displayName: 'Title',
						name: 'title',
						description: 'Title of the event to create',
						type: 'string',
						required: true,
						default: '',
						displayOptions: {
							show: { resource: ['event'], operation: ['create'] },
						},
					},
					{
						displayName: 'Additional Fields',
						name: 'additionalFields',
						type: 'collection',
						default: {},
						displayOptions: {
							show: { resource: ['event'], operation: ['create'] },
						},
						options: [
							{
								name: 'Description',
								value: 'description',
								description: 'Description of the event. HTML supported.',
							},
							{
								name: 'Start Date',
								value: 'start_date',
								description: 'Start date and time of the event',
							},
							{
								name: 'Location',
								value: 'location',
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
								],
							},
						],
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
							{ name: 'Get Many', value: 'getAll' },
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
							show: { resource: ['person'], operation: ['create'] },
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
							show: { resource: ['person'], operation: ['create'] },
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
						displayName: 'Person ID',
						name: 'personId',
						description: 'ID of the person to retrieve',
						type: 'string',
						required: true,
						default: '',
						displayOptions: {
							show: { resource: ['person'], operation: ['get'] },
						},
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						displayOptions: {
							show: { resource: ['petition'] },
						},
						options: [
							{ name: 'Create', value: 'create' },
							{ name: 'Get', value: 'get' },
							{ name: 'Get Many', value: 'getAll' },
						],
						default: 'create',
					},
					{
						displayName: 'Origin System',
						name: 'originSystem',
						description: 'Source where the petition originated',
						type: 'string',
						required: true,
						default: '',
						displayOptions: {
							show: { resource: ['petition'], operation: ['create'] },
						},
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						displayOptions: {
							show: { resource: ['signature'] },
						},
						options: [
							{ name: 'Create', value: 'create' },
							{ name: 'Get', value: 'get' },
							{ name: 'Get Many', value: 'getAll' },
						],
						default: 'create',
					},
					{
						displayName: 'Petition ID',
						name: 'petitionId',
						description: 'ID of the petition to sign',
						type: 'string',
						default: '',
						required: true,
						displayOptions: {
							show: { resource: ['signature'], operation: ['create'] },
						},
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						displayOptions: {
							show: { resource: ['tag'] },
						},
						options: [
							{ name: 'Create', value: 'create' },
							{ name: 'Get', value: 'get' },
							{ name: 'Get Many', value: 'getAll' },
						],
						default: 'create',
					},
					{
						displayName: 'Name',
						name: 'name',
						description: 'Name of the tag to create',
						type: 'string',
						required: true,
						default: '',
						displayOptions: {
							show: { resource: ['tag'], operation: ['create'] },
						},
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						displayOptions: {
							show: { resource: ['personTag'] },
						},
						options: [
							{ name: 'Add', value: 'add' },
							{ name: 'Remove', value: 'remove' },
						],
						default: 'add',
					},
					{
						displayName: 'Tag ID',
						name: 'tagId',
						description: 'ID of the tag to add',
						type: 'string',
						required: true,
						default: '',
						displayOptions: {
							show: { resource: ['personTag'], operation: ['add'] },
						},
					},
					{
						displayName: 'Person ID',
						name: 'personId',
						description: 'ID of the person to add the tag to',
						type: 'string',
						default: '',
						required: true,
						displayOptions: {
							show: { resource: ['personTag'], operation: ['add'] },
						},
					},
				],
			},
		];

		const result = await convertNodeToTypes(nodes);

		expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Action Network
// Node: n8n-nodes-base.actionNetwork

export interface ActionNetworkParameters {
  resource?:
    | 'attendance'
    | 'event'
    | 'person'
    | 'personTag'
    | 'petition'
    | 'signature'
    | 'tag';

  // Properties shown when: resource: attendance

  operation?: 'create' | 'get' | 'getAll';

  // Properties shown when: resource: attendance AND operation: create

  /** ID of the person to create an attendance for */
  personId: string;

  /** ID of the event to create an attendance for */
  eventId: string;

  /** Whether to return a simplified version of the response instead of the raw data */
  simple?: boolean;

  // Properties shown when: resource: event

  operation?: 'create' | 'get' | 'getAll';

  // Properties shown when: resource: event AND operation: create

  /** Source where the event originated */
  originSystem: string;

  /** Title of the event to create */
  title: string;

  additionalFields?: {
    /** Description of the event. HTML supported. */
    description?: any;
    /** Start date and time of the event */
    start_date?: any;
    location?: {
      /** Line for a person's address */
      address_lines?: string;
      /** Region specific postal code, such as ZIP code */
      postal_code?: string;
    };
  };

  // Properties shown when: resource: person

  operation?: 'create' | 'get' | 'getAll' | 'update';

  // Properties shown when: resource: person AND operation: create

  /** Person's email addresses */
  email_addresses?: {
    email_addresses_fields?: {
      /** Person's email address */
      address?: string;
      /** Subscription status of this email address */
      status?: 'bouncing' | 'subscribed' | 'unsubscribed';
    };
  };

  additionalFields?: {
    /** Person's last name */
    family_name?: any;
    /** Person's first name */
    given_name?: any;
    postal_addresses?: {
      /** Line for a person's address */
      address_lines?: string;
      location?: {
        location_fields?: {
          /** Latitude of the location of the address */
          latitude?: string;
          /** Longitude of the location of the address */
          longitude?: string;
        };
      };
    };
  };

  // Properties shown when: resource: person AND operation: get

  /** ID of the person to retrieve */
  personId: string;

  // Properties shown when: resource: petition

  operation?: 'create' | 'get' | 'getAll';

  // Properties shown when: resource: petition AND operation: create

  /** Source where the petition originated */
  originSystem: string;

  // Properties shown when: resource: signature

  operation?: 'create' | 'get' | 'getAll';

  // Properties shown when: resource: signature AND operation: create

  /** ID of the petition to sign */
  petitionId: string;

  // Properties shown when: resource: tag

  operation?: 'create' | 'get' | 'getAll';

  // Properties shown when: resource: tag AND operation: create

  /** Name of the tag to create */
  name: string;

  // Properties shown when: resource: personTag

  operation?: 'add' | 'remove';

  // Properties shown when: resource: personTag AND operation: add

  /** ID of the tag to add */
  tagId: string;

  /** ID of the person to add the tag to */
  personId: string;
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  'n8n-nodes-base.actionNetwork': ActionNetworkParameters;
}
`);
	});
});
