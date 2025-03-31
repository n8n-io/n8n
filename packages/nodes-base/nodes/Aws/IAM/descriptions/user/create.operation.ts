import {
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	NodeApiError,
	updateDisplayOptions,
	type INodeProperties,
	type IDataObject,
} from 'n8n-workflow';

import { validatePath } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'User Name',
		name: 'newUserName',
		default: '',
		description: 'The username of the new user to create',
		placeholder: 'e.g. JohnSmith',
		required: true,
		type: 'string',
		validateType: 'string',
		typeOptions: {
			maxLength: 64,
			regex: '^[A-Za-z0-9+=,\\.@_-]+$',
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				validateType: 'string',
				default: '',
				description: 'The path for the user name',
				placeholder: 'e.g. /division_abc/subdivision_xyz/',
				routing: {
					send: {
						preSend: [validatePath],
						property: 'Path',
						value: '={{ $value }}',
					},
				},
			},
			{
				displayName: 'Permissions Boundary',
				name: 'permissionsBoundary',
				default: '',
				description:
					'The ARN of the managed policy that is used to set the permissions boundary for the user',
				placeholder: 'e.g. arn:aws:iam::123456789012:policy/ExampleBoundaryPolicy',
				type: 'string',
				validateType: 'string',
				routing: {
					send: {
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								const permissionsBoundary = this.getNodeParameter(
									'additionalFields.permissionsBoundary',
								) as string;
								if (permissionsBoundary) {
									const arnPattern = /^arn:aws:iam::\d{12}:policy\/[\w\-+\/=._]+$/;
									if (!arnPattern.test(permissionsBoundary)) {
										throw new NodeApiError(
											this.getNode(),
											{},
											{
												message: 'Invalid permissions boundary',
												description:
													'Must be in ARN format, e.g., arn:aws:iam::123456789012:policy/ExamplePolicy',
											},
										);
									}
									requestOptions.url += `&PermissionsBoundary=${encodeURIComponent(permissionsBoundary)}`;
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'fixedCollection',
				description: 'A list of tags that you want to attach to the new user',
				default: [],
				placeholder: 'Add Tag',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'tags',
						displayName: 'Tag',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								placeholder: 'e.g., Department',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'e.g., Engineering',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								const tagsData = this.getNodeParameter('additionalFields.tags') as {
									tags: IDataObject[];
								};
								const tags = tagsData.tags;

								if (Array.isArray(tags)) {
									const tagParams = tags
										.map((tag, index) => {
											console.log(`Processing tag ${index + 1}:`, tag);
											return `Tags.member.${index + 1}.Key=${tag.key}&Tags.member.${index + 1}.Value=${tag.value}`;
										})
										.join('&');

									requestOptions.url += `&${tagParams}`;
								}

								return requestOptions;
							},
						],
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
