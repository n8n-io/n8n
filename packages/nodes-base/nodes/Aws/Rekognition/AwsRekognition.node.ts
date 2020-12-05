import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	awsApiRequestREST,
} from './GenericFunctions';

export class AwsRekognition implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Rekognition',
		name: 'awsRekognition',
		icon: 'file:rekognition.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to AWS Rekognition',
		defaults: {
			name: 'AWS Rekognition',
			color: '#305b94',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Image',
						value: 'image',
					},
				],
				default: 'image',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Analyze',
						value: 'analyze',
					},
				],
				default: 'analyze',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Detect Faces',
						value: 'detectFaces',
					},
					{
						name: 'Detect Labels',
						value: 'detectLabels',
					},
					{
						name: 'Detect Moderation Labels',
						value: 'detectModerationLabels',
					},
					{
						name: 'Recognize Celebrity',
						value: 'recognizeCelebrity',
					},
				],
				default: 'detectFaces',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Binary Data',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'analyze',
						],
						resource: [
							'image',
						],
					},
				},
				description: 'If the image to analize should be taken from binary field.',
			},
			{
				displayName: 'Binary Property',
				displayOptions: {
					show: {
						operation: [
							'analyze',
						],
						resource: [
							'image',
						],
						binaryData: [
							true,
						],
					},
				},
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'Object property name which holds binary data.',
				required: true,
			},
			{
				displayName: 'Bucket',
				name: 'bucket',
				displayOptions: {
					show: {
						operation: [
							'analyze',
						],
						resource: [
							'image',
						],
						binaryData: [
							false,
						],
					},
				},
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the S3 bucket',
			},
			{
				displayName: 'Name',
				name: 'name',
				displayOptions: {
					show: {
						operation: [
							'analyze',
						],
						resource: [
							'image',
						],
						binaryData: [
							false,
						],
					},
				},
				type: 'string',
				default: '',
				required: true,
				description: 'S3 object key name',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'analyze',
						],
						resource: [
							'image',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Version',
						name: 'version',
						displayOptions: {
							show: {
								'/binaryData': [
									false,
								],
							},
						},
						type: 'string',
						default: '',
						description: 'If the bucket is versioning enabled, you can specify the object version',
					},
					{
						displayName: 'Max Labels',
						name: 'maxLabels',
						type: 'number',
						displayOptions: {
							show: {
								'/type': [
									'detectModerationLabels',
									'detectLabels',
								],
							},
						},
						default: 0,
						typeOptions: {
							minValue: 0,
						},
						description: `Maximum number of labels you want the service to return in the response. The service returns the specified number of highest confidence labels.`,
					},
					{
						displayName: 'Min Confidence',
						name: 'minConfidence',
						type: 'number',
						displayOptions: {
							show: {
								'/type': [
									'detectModerationLabels',
									'detectLabels',
								],
							},
						},
						default: 0,
						typeOptions: {
							minValue: 0,
							maxValue: 100,
						},
						description: `Specifies the minimum confidence level for the labels to return. Amazon Rekognition doesn't return any labels with a confidence level lower than this specified value.`,
					},
					{
						displayName: 'Attributes',
						name: 'attributes',
						type: 'multiOptions',
						displayOptions: {
							show: {
								'/type': [
									'detectFaces',
								],
							},
						},
						options: [
							{
								name: 'All',
								value: 'all',
							},
							{
								name: 'Default',
								value: 'default',
							},
						],
						default: [],
						description: `An array of facial attributes you want to be returned`,
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < items.length; i++) {
			if (resource === 'image') {
				//https://docs.aws.amazon.com/rekognition/latest/dg/API_DetectModerationLabels.html#API_DetectModerationLabels_RequestSyntax
				if (operation === 'analyze') {
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					let action = undefined;

					let body: IDataObject = {};

					const type = this.getNodeParameter('type', 0) as string;

					if (type === 'detectModerationLabels') {
						action = 'RekognitionService.DetectModerationLabels';

						// property = 'ModerationLabels';

						if (additionalFields.minConfidence) {
							body['MinConfidence'] = additionalFields.minConfidence as number;
						}
					}

					if (type === 'detectFaces') {
						action = 'RekognitionService.DetectFaces';

						// TODO: Add a later point make it possible to activate via option.
						//       If activated add an index to each of the found faces/tages/...
						//       to not loose the reference to the image it got found on if
						//       multilpe ones got supplied.
						// property = 'FaceDetails';

						if (additionalFields.attributes) {
							body['Attributes'] = additionalFields.attributes as string;
						}
					}

					if (type === 'detectLabels') {
						action = 'RekognitionService.DetectLabels';

						if (additionalFields.minConfidence) {
							body['MinConfidence'] = additionalFields.minConfidence as number;
						}

						if (additionalFields.maxLabels) {
							body['MaxLabels'] = additionalFields.maxLabels as number;
						}
					}

					if (type === 'recognizeCelebrity') {
						action = 'RekognitionService.RecognizeCelebrities';
					}

					const binaryData = this.getNodeParameter('binaryData', 0) as boolean;

					if (binaryData) {

						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;

						if (items[i].binary === undefined) {
							throw new Error('No binary data exists on item!');
						}

						if ((items[i].binary as IBinaryKeyData)[binaryPropertyName] === undefined) {
							throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
						}

						const binaryPropertyData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];

						body = {
							Image: {
								Bytes: binaryPropertyData.data,
							},
						};

					} else {

						const bucket = this.getNodeParameter('bucket', i) as string;

						const name = this.getNodeParameter('name', i) as string;

						body = {
							Image: {
								S3Object: {
									Bucket: bucket,
									Name: name,
								},
							},
						};

						if (additionalFields.version) {
							//@ts-ignore
							body.Image.S3Object.Version = additionalFields.version as string;
						}
					}

					responseData = await awsApiRequestREST.call(this, 'rekognition', 'POST', '', JSON.stringify(body), {}, { 'X-Amz-Target': action, 'Content-Type': 'application/x-amz-json-1.1' });

					// if (property !== undefined) {
					// 	responseData = responseData[property as string];
					// }
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
