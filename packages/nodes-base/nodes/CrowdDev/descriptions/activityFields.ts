import type { INodeProperties } from 'n8n-workflow';

import { emailsField } from './shared';
import { getAdditionalOptions, mapWith, showFor } from './utils';
import { activityPresend } from '../GenericFunctions';

const displayOpts = showFor(['activity']);

const displayFor = {
	resource: displayOpts(),
	createWithMember: displayOpts(['createWithMember']),
	createForMember: displayOpts(['createForMember']),
};

const activityOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	displayOptions: displayFor.resource.displayOptions,
	noDataExpression: true,
	default: 'createWithMember',
	options: [
		{
			name: 'Create or Update with a Member',
			value: 'createWithMember',
			description: 'Create or update an activity with a member',
			action: 'Create or update an activity with a member',
			routing: {
				send: { preSend: [activityPresend] },
				request: {
					method: 'POST',
					url: '/activity/with-member',
				},
			},
		},
		{
			name: 'Create',
			value: 'createForMember',
			description: 'Create an activity for a member',
			action: 'Create an activity for a member',
			routing: {
				send: { preSend: [activityPresend] },
				request: {
					method: 'POST',
					url: '/activity',
				},
			},
		},
	],
};

const createWithMemberFields: INodeProperties[] = [
	{
		displayName: 'Username',
		name: 'username',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		required: true,
		default: {},
		options: [
			{
				displayName: 'Item Choice',
				name: 'itemChoice',
				values: [
					{
						displayName: 'Platform',
						description: 'Platform name (e.g twitter, github, etc)',
						name: 'key',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Username',
						description: 'Username at the specified Platform',
						name: 'value',
						type: 'string',
						required: true,
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'displayName',
		name: 'displayName',
		description: 'UI friendly name of the member',
		type: 'string',
		default: '',
	},
	emailsField,
	{
		displayName: 'Joined At',
		name: 'joinedAt',
		description: 'Date of joining the community',
		type: 'dateTime',
		default: '',
	},
];

const memberIdField: INodeProperties = {
	displayName: 'Member',
	name: 'member',
	description: 'The ID of the member that performed the activity',
	type: 'string',
	required: true,
	default: '',
};

const createCommonFields: INodeProperties[] = [
	{
		displayName: 'Type',
		name: 'type',
		description: 'Type of activity',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'Timestamp',
		name: 'timestamp',
		description: 'Date and time when the activity took place',
		type: 'dateTime',
		required: true,
		default: '',
	},
	{
		displayName: 'Platform',
		name: 'platform',
		description: 'Platform on which the activity took place',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'Source ID',
		name: 'sourceId',
		description: 'The ID of the activity in the platform (e.g. the ID of the message in Discord)',
		type: 'string',
		required: true,
		default: '',
	},
];

const additionalOptions: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		description: 'Title of the activity',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Body',
		name: 'body',
		description: 'Body of the activity',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Channel',
		name: 'channel',
		description: 'Channel of the activity',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Source Parent ID',
		name: 'sourceParentId',
		description:
			'The ID of the parent activity in the platform (e.g. the ID of the parent message in Discord)',
		type: 'string',
		default: '',
	},
];

const activityFields: INodeProperties[] = [
	...createWithMemberFields.map(mapWith(displayFor.createWithMember)),
	Object.assign({}, memberIdField, displayFor.createForMember),
	...createCommonFields.map(mapWith(displayFor.resource)),
	Object.assign({}, getAdditionalOptions(additionalOptions), displayFor.resource),
];

export { activityOperations, activityFields };
