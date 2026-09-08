import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { preSendAttributes } from '../../helpers/utils';
import { userPoolResourceLocator, userResourceLocator } from '../common.description';

const properties: INodeProperties[] = [
	{
		...userPoolResourceLocator,
		description: 'Select the user pool to use',
	},
	userResourceLocator,
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
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
