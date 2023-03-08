import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { awsApiRequestREST, keysTPascalCase } from './GenericFunctions';

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
				noDataExpression: true,
				options: [
					{
						name: 'Image',
						value: 'image',
					},
				],
				default: 'image',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Analyze',
						value: 'analyze',
					},
				],
				default: 'analyze',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['analyze'],
						resource: ['image'],
					},
				},
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
						name: 'Detect Text',
						value: 'detectText',
					},
					{
						name: 'Recognize Celebrity',
						value: 'recognizeCelebrity',
					},
				],
				default: 'detectFaces',
			},
			{
				displayName: 'Binary Data',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						operation: ['analyze'],
						resource: ['image'],
					},
				},
				description: 'Whether the image to analyze should be taken from binary field',
			},
			{
				displayName: 'Binary Property',
				displayOptions: {
					show: {
						operation: ['analyze'],
						resource: ['image'],
						binaryData: [true],
					},
				},
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'Object property name which holds binary data',
				required: true,
			},
			{
				displayName: 'Bucket',
				name: 'bucket',
				displayOptions: {
					show: {
						operation: ['analyze'],
						resource: ['image'],
						binaryData: [false],
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
						operation: ['analyze'],
						resource: ['image'],
						binaryData: [false],
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
						operation: ['analyze'],
						resource: ['image'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Regions of Interest',
						name: 'regionsOfInterestUi',
						type: 'fixedCollection',
						default: {},
						placeholder: 'Add Region of Interest',
						displayOptions: {
							show: {
								'/type': ['detectText'],
							},
						},
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								name: 'regionsOfInterestValues',
								displayName: 'Region of Interest',
								values: [
									{
										displayName: 'Height',
										name: 'height',
										type: 'number',
										description:
											'Height of the bounding box as a ratio of the overall image height',
										default: 0,
									},
									{
										displayName: 'Left',
										name: 'left',
										type: 'number',
										description:
											'Left coordinate of the bounding box as a ratio of overall image width',
										default: 0,
									},
									{
										displayName: 'Top',
										name: 'top',
										type: 'number',
										description:
											'Top coordinate of the bounding box as a ratio of overall image height',
										default: 0,
									},
									{
										displayName: 'Width',
										name: 'Width',
										type: 'number',
										description: 'Width of the bounding box as a ratio of the overall image width',
										default: 0,
									},
								],
							},
						],
					},
					{
						displayName: 'Version',
						name: 'version',
						displayOptions: {
							show: {
								'/binaryData': [false],
							},
						},
						type: 'string',
						default: '',
						description: 'If the bucket is versioning enabled, you can specify the object version',
					},
					{
						displayName: 'Word Filter',
						name: 'wordFilterUi',
						type: 'collection',
						default: {},
						placeholder: 'Add Word Filter',
						displayOptions: {
							show: {
								'/type': ['detectText'],
							},
						},
						typeOptions: {
							multipleValues: false,
						},
						options: [
							{
								displayName: 'Min Bounding Box Height',
								name: 'MinBoundingBoxHeight',
								type: 'number',
								description:
									'Sets the minimum height of the word bounding box. Words with bounding box heights lesser than this value will be excluded from the result. Value is relative to the video frame height.',
								default: 0,
							},
							{
								displayName: 'Min Bounding Box Width',
								name: 'MinBoundingBoxWidth',
								type: 'number',
								description:
									'Sets the minimum width of the word bounding box. Words with bounding boxes widths lesser than this value will be excluded from the result. Value is relative to the video frame width.',
								default: 0,
							},
							{
								displayName: 'Min Confidence',
								name: 'MinConfidence',
								type: 'number',
								description:
									'Sets the confidence of word detection. Words with detection confidence below this will be excluded from the result. Values should be between 50 and 100 as Text in Video will not return any result below 50.',
								default: 0,
							},
						],
					},
					{
						displayName: 'Max Labels',
						name: 'maxLabels',
						type: 'number',
						displayOptions: {
							show: {
								'/type': ['detectModerationLabels', 'detectLabels'],
							},
						},
						default: 0,
						typeOptions: {
							minValue: 0,
						},
						description:
							'Maximum number of labels you want the service to return in the response. The service returns the specified number of highest confidence labels.',
					},
					{
						displayName: 'Min Confidence',
						name: 'minConfidence',
						type: 'number',
						displayOptions: {
							show: {
								'/type': ['detectModerationLabels', 'detectLabels'],
							},
						},
						default: 0,
						typeOptions: {
							minValue: 0,
							maxValue: 100,
						},
						description:
							"Specifies the minimum confidence level for the labels to return. Amazon Rekognition doesn't return any labels with a confidence level lower than this specified value.",
					},
					{
						displayName: 'Attributes',
						name: 'attributes',
						type: 'multiOptions',
						displayOptions: {
							show: {
								'/type': ['detectFaces'],
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
						description: 'An array of facial attributes you want to be returned',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'image') {
					//https://docs.aws.amazon.com/rekognition/latest/dg/API_DetectModerationLabels.html#API_DetectModerationLabels_RequestSyntax
					if (operation === 'analyze') {
						const additionalFields = this.getNodeParameter('additionalFields', i);

						let action = undefined;

						const body: IDataObject = {};

						const type = this.getNodeParameter('type', 0) as string;

						if (type === 'detectModerationLabels') {
							action = 'RekognitionService.DetectModerationLabels';

							// property = 'ModerationLabels';

							if (additionalFields.minConfidence) {
								body.MinConfidence = additionalFields.minConfidence as number;
							}
						}

						if (type === 'detectFaces') {
							action = 'RekognitionService.DetectFaces';

							// TODO: Add a later point make it possible to activate via option.
							//       If activated add an index to each of the found faces/tags/...
							//       to not loose the reference to the image it got found on if
							//       multiple ones got supplied.
							// property = 'FaceDetails';

							if (additionalFields.attributes) {
								body.Attributes = additionalFields.attributes as string;
							}
						}

						if (type === 'detectLabels') {
							action = 'RekognitionService.DetectLabels';

							if (additionalFields.minConfidence) {
								body.MinConfidence = additionalFields.minConfidence as number;
							}

							if (additionalFields.maxLabels) {
								body.MaxLabels = additionalFields.maxLabels as number;
							}
						}

						if (type === 'recognizeCelebrity') {
							action = 'RekognitionService.RecognizeCelebrities';
						}

						if (type === 'detectText') {
							action = 'RekognitionService.DetectText';

							body.Filters = {};

							const box =
								((additionalFields.regionsOfInterestUi as IDataObject)
									?.regionsOfInterestValues as IDataObject[]) || [];

							if (box.length !== 0) {
								//@ts-ignore
								body.Filters.RegionsOfInterest = box.map((entry: IDataObject) => {
									return { BoundingBox: keysTPascalCase(entry) };
								});
							}

							const wordFilter = (additionalFields.wordFilterUi as IDataObject) || {};
							if (Object.keys(wordFilter).length !== 0) {
								//@ts-ignore
								body.Filters.WordFilter = keysTPascalCase(wordFilter);
							}

							const isBinaryData = this.getNodeParameter('binaryData', i);
							if (isBinaryData) {
								const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
								const binaryPropertyData = this.helpers.assertBinaryData(i, binaryPropertyName);
								Object.assign(body, {
									Image: {
										Bytes: binaryPropertyData.data,
									},
								});
							} else {
								const bucket = this.getNodeParameter('bucket', i) as string;
								const name = this.getNodeParameter('name', i) as string;

								Object.assign(body, {
									Image: {
										S3Object: {
											Bucket: bucket,
											Name: name,
										},
									},
								});

								if (additionalFields.version) {
									//@ts-ignore
									body.Image.S3Object.Version = additionalFields.version as string;
								}
							}

							responseData = await awsApiRequestREST.call(
								this,
								'rekognition',
								'POST',
								'',
								JSON.stringify(body),
								{},
								{ 'X-Amz-Target': action, 'Content-Type': 'application/x-amz-json-1.1' },
							);
						}
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [returnData as INodeExecutionData[]];
	}
}
