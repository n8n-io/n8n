import {
	INodeProperties,
} from 'n8n-workflow';

export const meetingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
];

export const meetingFields: INodeProperties[] = [
	// ----------------------------------------
	//             meeting: create
	// ----------------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Meeting title. The title can be a maximum of 128 characters long',
	},
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Date and time for the start of the meeting. Acceptable <a href="https://datatracker.ietf.org/doc/html/rfc2445"> format</a>',
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Date and time for the end of the meeting. Acceptable <a href="https://datatracker.ietf.org/doc/html/rfc2445"> format</a>',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Agenda',
				name: 'agenda',
				type: 'string',
				default: '',
				description: 'Meeting agenda. The agenda can be a maximum of 1300 characters long',
			},
			{
				displayName: 'Allow Any User To Be Co-Host',
				name: 'allowAnyUserToBeCoHost',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow any attendee with a host account on the target site to become a co-host when joining the meeting`,
			},
			{
				displayName: 'Allow Authenticated Devices',
				name: 'allowAuthenticatedDevices',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow authenticated video devices in the meeting's organization to start or join the meeting without a prompt`,
			},
			{
				displayName: 'Allow First User To Be Co-Host',
				name: 'allowFirstUserToBeCoHost',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow the first attendee of the meeting with a host account on the target site to become a co-host`,
			},
			{
				displayName: 'Auto Accept Request',
				name: 'autoAcceptRequest',
				type: 'boolean',
				default: false,
				description: 'Whether or not meeting registration request is accepted automatically',
			},
			{
				displayName: 'Enable Connect Audio Before Host',
				name: 'enableConnectAudioBeforeHost',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow any attendee to connect audio in the meeting before the host joins the meeting`,
			},
			{
				displayName: 'Enabled Auto Record Meeting',
				name: 'enabledAutoRecordMeeting',
				type: 'boolean',
				default: false,
				description: `Whether or not meeting is recorded automatically`,
			},
			{
				displayName: 'Enabled Join Before Host',
				name: 'enabledJoinBeforeHost',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow any attendee to join the meeting before the host joins the meeting`,
			},
			{
				displayName: 'Exclude Password',
				name: 'excludePassword',
				type: 'boolean',
				default: false,
				description: `Whether or not to exclude password from the meeting email invitation`,
			},
			{
				displayName: 'Host Email',
				name: 'hostEmail',
				type: 'string',
				default: '',
				description: `Email address for the meeting host. Can only be set if you're an admin`,
			},
			{
				displayName: 'Integration Tags',
				name: 'integrationTags',
				type: 'string',
				default: '',
				description: `External keys created by an integration application in its own domain. They could be Zendesk ticket IDs, Jira IDs, Salesforce Opportunity IDs, etc`,
			},
			{
				displayName: 'Invitees',
				name: 'inviteesUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: '',
				placeholder: 'Add Invitee',
				options: [
					{
						displayName: 'Invitee',
						name: 'inviteeValues',
						values: [
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								required: true,
								default: '',
								description: 'Email address of meeting invitee',
							},
							{
								displayName: 'Display Name',
								name: 'displayName',
								type: 'string',
								default: '',
								description: 'Display name of meeting invitee',
							},
							{
								displayName: 'Co-Host',
								name: 'coHost',
								type: 'boolean',
								default: false,
								description: 'Whether or not invitee is allowed to be a co-host for the meeting',
							},
						],
					},
				],
			},
			{
				displayName: 'Join Before Host Minutes',
				name: 'joinBeforeHostMinutes',
				type: 'options',
				options: [
					{
						name: '0',
						value: 0,
					},
					{
						name: '5',
						value: 5,
					},
					{
						name: '10',
						value: 10,
					},
					{
						name: '15',
						value: 15,
					},
				],
				default: 0,
				description: `The number of minutes an attendee can join the meeting before the meeting start time and the host joins`,
			},
			{
				displayName: 'Public Meeting',
				name: 'publicMeeting',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow the meeting to be listed on the public calendar`,
			},
			{
				displayName: 'Recurrence',
				name: 'recurrence',
				type: 'string',
				default: '',
				description: `Rule for how the meeting should recur. Acceptable <a href="https://datatracker.ietf.org/doc/html/rfc2445"> format</a>`,
			},
			{
				displayName: 'Required Registration Info',
				name: 'requireRegistrationInfo',
				type: 'multiOptions',
				options: [
					{
						name: 'Require First Name',
						value: 'requireFirstName',
					},
					{
						name: 'Require Last Name',
						value: 'requireLastName',
					},
					{
						name: 'Require Email',
						value: 'requireEmail',
					},
					{
						name: 'Require Job Title',
						value: 'requireJobTitle',
					},
					{
						name: 'Require Company Name',
						value: 'requireCompanyName',
					},
					{
						name: 'Require Address 1',
						value: 'requireAddress1',
					},
					{
						name: 'Require Address 2',
						value: 'requireAddress2',
					},
					{
						name: 'Require City',
						value: 'requireCity',
					},
					{
						name: 'Require State',
						value: 'requireState',
					},
					{
						name: 'Require Zip Code',
						value: 'requireZipCode',
					},
					{
						name: 'Require Country Region',
						value: 'requireCountryRegion',
					},
					{
						name: 'Require Work Phone',
						value: 'requireWorkPhone',
					},
					{
						name: 'Require Fax',
						value: 'requireFax',
					},
				],
				default: [],
				description: 'Data required for meeting registration',
			},
			{
				displayName: 'Reminder Time',
				name: 'reminderTime',
				type: 'number',
				default: 1,
				description: `The number of minutes before the meeting begins, for sending an email reminder to the host`,
			},
			{
				displayName: 'Send Email',
				name: 'sendEmail',
				type: 'boolean',
				default: true,
				description: `Whether or not to send emails to host and invitees`,
			},
			{
				displayName: 'Site URL',
				name: 'siteUrl',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSites',
				},
				default: '',
				description: `URL of the Webex site which the meeting is created on. If not specified, the meeting is created on user's preferred site`,
			},
		],
	},

	// ----------------------------------------
	//             meeting: delete
	// ----------------------------------------
	{
		displayName: 'Meeting ID',
		name: 'meetingId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'ID of the meeting',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'delete',
				],
			},
		},
		options: [
			{
				displayName: 'Host Email',
				name: 'hostEmail',
				type: 'string',
				default: '',
				description: 'Email address for the meeting host. This parameter is only used if the user or application calling the API has the admin-level scopes',
			},
			{
				displayName: 'Send Email',
				name: 'sendEmail',
				type: 'boolean',
				default: true,
				description: 'Whether or not to send emails to host and invitees.',
			},
		],
	},

	// ----------------------------------------
	//               meeting: get
	// ----------------------------------------
	{
		displayName: 'Meeting ID',
		name: 'meetingId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'ID of the meeting',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Host Email',
				name: 'hostEmail',
				type: 'string',
				default: '',
				description: 'Email address for the meeting host. This parameter is only used if the user or application calling the API has the admin-level scopes',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: `Meeting password. It's required when the meeting is protected by a password and the current user is not privileged to view it if they are not a host, co-host or invitee of the meeting`,
			},
			{
				displayName: 'Send Email',
				name: 'sendEmail',
				type: 'boolean',
				default: true,
				description: 'Whether or not to send emails to host and invitees. It is an optional field and default value is true',
			},
		],
	},

	// ----------------------------------------
	//             meeting: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'The number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
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
				resource: [
					'meeting',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Start date and time (inclusive) for the meeting. Acceptable <a href="https://datatracker.ietf.org/doc/html/rfc2445"> format</a>',
			},
			{
				displayName: 'Host Email',
				name: 'hostEmail',
				type: 'string',
				default: '',
				description: 'Email address for the meeting host',
			},
			{
				displayName: 'Integration Tag',
				name: 'integrationTag',
				type: 'string',
				default: '',
				description: 'External tag created by another application, e.g. Zendesk ticket ID or Jira ID',
			},
			{
				displayName: 'Limit to Current Meetings',
				name: 'current',
				type: 'boolean',
				default: true,
				description: 'For meeting series, whether to return just the current meeting or all meetings',
			},
			{
				displayName: 'Meeting Number',
				name: 'meetingNumber',
				type: 'string',
				default: '',
				description: 'Meeting number for the meeting objects being requested',
			},
			{
				displayName: 'Meeting Type',
				name: 'meetingType',
				type: 'options',
				options: [
					{
						name: 'Meeting Series',
						value: 'meetingSeries',
						description: 'Master of a scheduled series of meetings which consists of one or more scheduled meeting based on a recurrence rule',
					},
					{
						name: 'Scheduled Meeting',
						value: 'scheduledMeeting',
						description: 'Instance from a master meeting series',
					},
					{
						name: 'Meeting',
						value: 'meeting',
						description: 'Meeting instance that is actually happening or has happened',
					},
				],
				default: 'meetingSeries',
			},
			{
				displayName: 'Participant Email',
				name: 'participantEmail',
				type: 'string',
				default: '',
				description: 'Email of a person that must be a meeting participant',
			},
			{
				displayName: 'Site URL',
				name: 'siteUrl',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSites',
				},
				default: '',
				description: 'URL of the Webex site which the API lists meetings from',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Scheduled',
						value: 'scheduled',
					},
					{
						name: 'Ready',
						value: 'ready',
					},
					{
						name: 'Lobby',
						value: 'lobby',
					},
					{
						name: 'In Progress',
						value: 'inProgress',
					},
					{
						name: 'Ended',
						value: 'ended',
					},
					{
						name: 'Missed',
						value: 'missed',
					},
					{
						name: 'Expired',
						value: 'expired',
					},
				],
				default: '',
				description: 'Meeting state for the meeting objects being requested',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'End date and time (inclusive) for the meeting. Acceptable <a href="https://datatracker.ietf.org/doc/html/rfc2445"> format</a>',
			},
			{
				displayName: 'Weblink',
				name: 'webLink',
				type: 'string',
				default: '',
				description: 'URL encoded link to information page for the meeting objects being requested',
			},
		],
	},

	// ----------------------------------------
	//             meeting: update
	// ----------------------------------------
	{
		displayName: 'Meeting ID',
		name: 'meetingId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'ID of the meeting',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Agenda',
				name: 'agenda',
				type: 'string',
				default: '',
				description: `The meeting's agenda. Cannot be longer that 1300 characters`,
			},
			{
				displayName: 'Allow Any User To Be Co-Host',
				name: 'allowAnyUserToBeCoHost',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow any attendee with a host account on the target site to become a co-host when joining the meeting`,
			},
			{
				displayName: 'Allow Authenticated Devices',
				name: 'allowAuthenticatedDevices',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow authenticated video devices in the meeting's organization to start or join the meeting without a prompt`,
			},
			{
				displayName: 'Allow First User To Be Co-Host',
				name: 'allowFirstUserToBeCoHost',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow the first attendee of the meeting with a host account on the target site to become a co-host`,
			},
			{
				displayName: 'Enable Connect Audio Before Host',
				name: 'enableConnectAudioBeforeHost',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow any attendee to connect audio in the meeting before the host joins the meeting`,
			},
			{
				displayName: 'Enabled Auto Record Meeting',
				name: 'enabledAutoRecordMeeting',
				type: 'boolean',
				default: false,
				description: `Whether or not meeting is recorded automatically`,
			},
			{
				displayName: 'Enabled Join Before Host',
				name: 'enabledJoinBeforeHost',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow any attendee to join the meeting before the host joins the meeting`,
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				default: '',
				description: 'Date and time for the end of the meeting. Acceptable <a href="https://datatracker.ietf.org/doc/html/rfc2445"> format</a>',
			},
			{
				displayName: 'Exclude Password',
				name: 'excludePassword',
				type: 'boolean',
				default: false,
				description: `Whether or not to exclude password from the meeting email invitation`,
			},
			{
				displayName: 'Host Email',
				name: 'hostEmail',
				type: 'string',
				default: '',
				description: `Email address for the meeting host. This attribute should only be set if the user or application calling the API has the admin-level scopes`,
			},
			{
				displayName: 'Invitees',
				name: 'inviteesUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: '',
				placeholder: 'Add Invitee',
				options: [
					{
						displayName: 'Invitee',
						name: 'inviteeValues',
						values: [
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								required: true,
								default: '',
								description: 'Email address of meeting invitee',
							},
							{
								displayName: 'Display Name',
								name: 'displayName',
								type: 'string',
								default: '',
								description: 'Display name of meeting invitee',
							},
							{
								displayName: 'Co-Host',
								name: 'coHost',
								type: 'boolean',
								default: false,
								description: 'Whether or not invitee is allowed to be a co-host for the meeting',
							},
						],
					},
				],
			},
			{
				displayName: 'Join Before Host Minutes',
				name: 'joinBeforeHostMinutes',
				type: 'options',
				options: [
					{
						name: '0',
						value: 0,
					},
					{
						name: '5',
						value: 5,
					},
					{
						name: '10',
						value: 10,
					},
					{
						name: '15',
						value: 15,
					},
				],
				default: 0,
				description: `The number of minutes an attendee can join the meeting before the meeting start time and the host joins`,
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: `Meeting password. Must conform to the site's password complexity settings. If not specified, a random password conforming to the site's password rules will be generated automatically`,
			},
			{
				displayName: 'Public Meeting',
				name: 'publicMeeting',
				type: 'boolean',
				default: false,
				description: `Whether or not to allow the meeting to be listed on the public calendar`,
			},
			{
				displayName: 'Recurrence',
				name: 'recurrence',
				type: 'string',
				default: '',
				description: `Meeting series recurrence rule (conforming with RFC 2445), applying only to meeting series`,
			},
			{
				displayName: 'Required Registration Info',
				name: 'requireRegistrationInfo',
				type: 'multiOptions',
				options: [
					{
						name: 'Require First Name',
						value: 'requireFirstName',
					},
					{
						name: 'Require Last Name',
						value: 'requireLastName',
					},
					{
						name: 'Require Email',
						value: 'requireEmail',
					},
					{
						name: 'Require Job Title',
						value: 'requireJobTitle',
					},
					{
						name: 'Require Company Name',
						value: 'requireCompanyName',
					},
					{
						name: 'Require Address 1',
						value: 'requireAddress1',
					},
					{
						name: 'Require Address 2',
						value: 'requireAddress2',
					},
					{
						name: 'Require City',
						value: 'requireCity',
					},
					{
						name: 'Require State',
						value: 'requireState',
					},
					{
						name: 'Require Zip Code',
						value: 'requireZipCode',
					},
					{
						name: 'Require Country Region',
						value: 'requireCountryRegion',
					},
					{
						name: 'Require Work Phone',
						value: 'requireWorkPhone',
					},
					{
						name: 'Require Fax',
						value: 'requireFax',
					},
				],
				default: [],
				description: 'Data required for meeting registration',
			},
			{
				displayName: 'Reminder Time',
				name: 'reminderTime',
				type: 'number',
				default: 1,
				description: `The number of minutes before the meeting begins, for sending an email reminder to the host`,
			},
			{
				displayName: 'Send Email',
				name: 'sendEmail',
				type: 'boolean',
				default: false,
				description: `Whether or not to send emails to host and invitees. It is an optional field and default value is true`,
			},
			{
				displayName: 'Site URL',
				name: 'siteUrl',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSites',
				},
				default: '',
				description: `URL of the Webex site which the meeting is created on. If not specified, the meeting is created on user's preferred site`,
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				default: '',
				description: 'Date and time for the start of the meeting. Acceptable <a href="https://datatracker.ietf.org/doc/html/rfc2445"> format</a>',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Meeting title',
			},
		],
	},
];
