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
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
