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
				displayName: 'Force Alias Creation',
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
				displayName: 'User Attributes',
				name: 'userAttributes',
				type: 'fixedCollection',
				placeholder: 'Add Attribute',
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
								displayName: 'Attribute Type',
								name: 'attributeType',
								type: 'options',
								default: 'standard',
								options: [
									{
										name: 'Standard Attribute',
										value: 'standard',
									},
									{
										name: 'Custom Attribute',
										value: 'custom',
									},
								],
							},
							{
								displayName: 'Standard Attribute',
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
										name: 'Email Verified',
										value: 'email_verified',
									},
									{
										name: 'Family Name',
										value: 'family_name',
									},
									{
										name: 'Gender',
										value: 'gender',
									},
									{
										name: 'Given Name',
										value: 'given_name',
									},
									{
										name: 'Locale',
										value: 'locale',
									},
									{
										name: 'Middle Name',
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
										name: 'Phone Number',
										value: 'phone_number',
									},
									{
										name: 'Phone Number Verified',
										value: 'phone_number_verified',
									},
									{
										name: 'Preferred Username',
										value: 'preferred_username',
									},
									{
										name: 'Profile Picture',
										value: 'profilepicture',
									},
									{
										name: 'Updated At',
										value: 'updated_at',
									},
									{
										name: 'User Sub',
										value: 'sub',
									},
									{
										name: 'Website',
										value: 'website',
									},
									{
										name: 'Zone Info',
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
								displayName: 'Custom Attribute Name',
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
				displayName: 'Desired Delivery Mediums',
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
