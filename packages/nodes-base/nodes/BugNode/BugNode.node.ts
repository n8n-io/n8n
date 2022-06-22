import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

export class BugNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BugNode',
		name: 'bugnode',
		icon: 'file:bugnode.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Example node to display bug',
		defaults: {
			name: 'BugNode',
			color: '#044a75',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		requestDefaults: {
			baseURL: 'https://httpbin.org',
			url: '',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Send',
						value: 'send',
					},
				],
				default: 'send',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Post',
						value: 'post',
					},
				],
				default: 'post',
				routing: {
					request: {
						method: 'POST',
						url: '/post',
					},
				},
			},
			{
				displayName: 'Additional Parameters',
				name: 'additionalParameters',
				placeholder: 'Add Parameter',
				description: 'Additional fields to add',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						resource: ['send'],
						operation: ['post'],
					},
				},
				options: [
					{
						displayName: 'Attachments',
						name: 'emailAttachments',
						placeholder: 'Add Attachment',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'attachment',
								displayName: 'Attachment Data',
								values: [
									{
										default: false,
										displayName: 'Use Attachment Url',
										name: 'useAttachmentUrl',
										type: 'boolean',
									},
									{
										default: '',
										displayName: 'Attachment Url',
										displayOptions: {
											hide: {
												useAttachmentUrl: [false],
											},
										},
										name: 'url',
										routing: {
											send: {
												property: '=attachment[{{$index}}].url',
												type: 'body',
											},
										},
										type: 'string',
									},
									{
										default: '',
										displayName: 'Attachment Data',
										displayOptions: {
											hide: {
												useAttachmentUrl: [true],
											},
										},
										name: 'content',
										routing: {
											send: {
												property: '=attachment[{{$index}}].content',
												type: 'body',
											},
										},
										type: 'string',
									},
									{
										default: '',
										description: 'Name of attachment to be shown, must include file type',
										displayName: 'Attachment Name',
										displayOptions: {
											hide: {
												useAttachmentUrl: [true],
											},
										},
										name: 'name',
										routing: {
											send: {
												property: '=attachment[{{$index}}].name',
												type: 'body',
											},
										},
										type: 'string',
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
										const attachments = this.getNodeParameter(
											'additionalParameters.emailAttachments.attachment',
										) as JsonObject[];
										const { body } = requestOptions;

										const { attachment } = body as unknown as JsonObject;

										for (let [index, attachmentData] of attachments.entries()) {
											const { useAttachmentUrl } = attachmentData;
											const { content, name, url } = (
												attachment as { content: string; name: string; url: string }[]
											)[index];
											console.log(useAttachmentUrl);
											console.log({ content, name, url });
										}

										return requestOptions;
									},
								],
							},
						},
					},
				],
			},
		],
	};
}
