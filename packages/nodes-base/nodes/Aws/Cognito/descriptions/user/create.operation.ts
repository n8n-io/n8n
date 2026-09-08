import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { preSendAttributes, preSendDesiredDeliveryMediums } from '../../helpers/utils';
import { userPoolResourceLocator } from '../common.description';

const properties: INodeProperties[] = [
	{
		...userPoolResourceLocator,
		description: 'Select the user pool to retrieve',
	},
	{
		displayName: 'User name',
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
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		options: [
			{
				displayName: 'Message action',
				name: 'messageAction',
				default: 'RESEND',
				type: 'options',
				options: [
					{
						name: 'Resend',
						value: 'RESEND',
						description:
							"Resend the invitation message to a user that already exists and reset the expiration limit on the user's account",
					},
					{
						name: 'Suppress',
						value: 'SUPPRESS',
						description: 'Suppress sending the message',
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
				displayName: 'Force alias creation',
				name: 'forceAliasCreation',
				type: 'boolean',
				validateType: 'boolean',
				default: false,
				description:
					'Whether this parameter is used only if the phone_number_verified or email_verified attribute is set to true. Otherwise, it is ignored. If set to true, and the phone number or email address specified in the UserAttributes parameter already exists as an alias with a different user, the alias will be migrated. If set to false, an AliasExistsException error is thrown if the alias already exists.',
				routing: {
					send: {
						type: 'body',
						property: 'ForceAliasCreation',
					},
				},
			},
			{
				displayName: 'User attributes',
				name: 'userAttributes',
				type: 'fixedCollection',
				placeholder: 'Add attribute',
				default: {
					attributes: [],
				},
				required: true,
				description: 'Attributes to update for the user',
				typeOptions: {
					multipleValues: true,
				},
				routing: {
					send: {
						preSend: [preSendAttributes],
					},
				},
				options: [
					{
						displayName: 'Attributes',
						name: 'attributes',
						values: [
							{
								displayName: 'Attribute type',
								name: 'attributeType',
								type: 'options',
								default: 'standard',
								options: [
									{
										name: 'Standard attribute',
										value: 'standard',
									},
									{
										name: 'Custom attribute',
										value: 'custom',
									},
								],
							},
							{
								displayName: 'Standard attribute',
								name: 'standardName',
								type: 'options',
								default: 'address',
								options: [
									{
										name: 'Address',
										value: 'address',
									},
									{
										name: 'Birthdate',
										value: 'birthdate',
									},
									{
										name: 'Email',
										value: 'email',
									},
									{
										name: 'Email verified',
										value: 'email_verified',
									},
									{
										name: 'Family name',
										value: 'family_name',
									},
									{
										name: 'Gender',
										value: 'gender',
									},
									{
										name: 'Given name',
										value: 'given_name',
									},
									{
										name: 'Locale',
										value: 'locale',
									},
									{
										name: 'Middle name',
										value: 'middle_name',
									},
									{
										name: 'Name',
										value: 'name',
									},
									{
										name: 'Nickname',
										value: 'nickname',
									},
									{
										name: 'Phone number',
										value: 'phone_number',
									},
									{
										name: 'Phone number verified',
										value: 'phone_number_verified',
									},
									{
										name: 'Preferred username',
										value: 'preferred_username',
									},
									{
										name: 'Profile picture',
										value: 'profilepicture',
									},
									{
										name: 'Updated at',
										value: 'updated_at',
									},
									{
										name: 'User sub',
										value: 'sub',
									},
									{
										name: 'Website',
										value: 'website',
									},
									{
										name: 'Zone info',
										value: 'zoneinfo',
									},
								],
								displayOptions: {
									show: {
										attributeType: ['standard'],
									},
								},
							},
							{
								displayName: 'Custom attribute name',
								name: 'customName',
								type: 'string',
								default: '',
								placeholder: 'custom:myAttribute',
								description: 'The name of the custom attribute (must start with "custom:")',
								displayOptions: {
									show: {
										attributeType: ['custom'],
									},
								},
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value of the attribute',
							},
						],
					},
				],
			},
			{
				displayName: 'Desired delivery mediums',
				name: 'desiredDeliveryMediums',
				default: ['SMS'],
				description: 'Specify how to send the welcome message',
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
						preSend: [preSendDesiredDeliveryMediums],
						property: 'DesiredDeliveryMediums',
						type: 'body',
					},
				},
			},
			{
				displayName: 'Temporary password',
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
