import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { userPoolResourceLocator } from '../common';

const properties: INodeProperties[] = [
	{ ...userPoolResourceLocator, description: 'Select the user pool to retrieve' },
	{
		displayName: 'User Name',
		name: 'newUserName',
		default: '',
		description:
			'Depending on the user pool settings, this parameter requires the username, the email, or the phone number. No whitespace is allowed.',
		placeholder: 'e.g. JohnSmith',
		required: true,
		routing: {
			send: {
				property: 'Username',
				type: 'body',
			},
		},
		type: 'string',
		validateType: 'string',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Message Action',
				name: 'messageAction',
				default: 'RESEND',
				description:
					"Set to RESEND to resend the invitation message to a user that already exists and reset the expiration limit on the user's account. Set to SUPPRESS to suppress sending the message.",
				type: 'options',
				options: [
					{
						name: 'Resend',
						value: 'RESEND',
					},
					{
						name: 'Suppress',
						value: 'SUPPRESS',
					},
				],
				routing: {
					send: {
						property: 'MessageAction',
						type: 'body',
					},
				},
			},
			{
				displayName: 'Force Alias Creation',
				name: 'forceAliasCreation',
				type: 'boolean',
				validateType: 'boolean',
				default: false,
				description:
					'Whether this parameter is used only if the phone_number_verified or email_verified attribute is set to True. Otherwise, it is ignored. If set to True, and the phone number or email address specified in the UserAttributes parameter already exists as an alias with a different user, the alias will be migrated. If set to False, an AliasExistsException error is thrown if the alias already exists',
				routing: {
					send: {
						type: 'body',
						property: 'ForceAliasCreation',
					},
				},
			},
			{
				displayName: 'Desired Delivery Mediums',
				name: 'desiredDeliveryMediums',
				default: ['SMS'],
				description:
					'Specify EMAIL if email will be used to send the welcome message. Specify SMS if the phone number will be used. The default value is SMS. You can specify more than one value.',
				type: 'multiOptions',
				options: [
					{
						name: 'SMS',
						value: 'SMS',
					},
					{
						name: 'Email',
						value: 'EMAIL',
					},
				],
				routing: {
					send: {
						property: 'DesiredDeliveryMediums',
						type: 'body',
					},
				},
			},
			{
				displayName: 'Temporary Password',
				name: 'temporaryPasswordOptions',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description:
					"The user's temporary password that will be valid only once. If not set, Amazon Cognito will automatically generate one for you.",
				routing: {
					send: {
						property: 'TemporaryPassword',
						type: 'body',
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
