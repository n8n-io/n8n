import type { IExecuteFunctions } from 'n8n-core';
import keys from 'lodash.keys';
import keyBy from 'lodash.keyby';

import type {
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { thumbnailFields } from './operations/thumbnail/fields';
import { executeThumbnail } from './operations/thumbnail/execute';
import { executeConvert } from './operations/convert/execute';
import { executeMerge } from './operations/merge/execute';
import { executeArchive } from './operations/archive/execute';
import { executeOptimize } from './operations/optimize/execute';
import { watermarkFields } from './operations/watermark/fields';
import { executeWatermark } from './operations/watermark/execute';
import { executeMetadata } from './operations/metadata/execute';
import { executeCaptureWebsite } from './operations/capture-website/execute';
import { captureWebsiteFields } from './operations/capture-website/fields';

export class CloudConvert implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CloudConvert',
		name: 'cloudConvert',
		/* eslint-disable n8n-nodes-base/node-class-description-icon-not-svg */
		icon: 'file:cloudconvert.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description:
			'Use CloudConvert to convert files, create thumbnails, merge files, add watermarks and more!',
		defaults: {
			name: 'CloudConvert',
		},
		inputs: ['main'],
		outputs: ['main'],
		/**
		 * Auth
		 */
		credentials: [
			{
				name: 'cloudConvertApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
			},
			{
				name: 'cloudConvertOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'OAuth2 (Recommended)',
						value: 'oAuth2',
					},
					{
						name: 'API Key',
						value: 'apiKey',
					},
				],
				default: 'oAuth2',
			},
			/**
			 * Operations
			 */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Add Watermark',
						value: 'watermark',
						description: 'Add a watermark to a PDF file, to an image or to a video',
						action: 'Add watermark to a file',
					},
					{
						name: 'Capture Website',
						value: 'capture-website',
						description:
							'Creates job to capture a website as PDF or create a website screenshot as JPG or PNG',
						action: 'Capture website',
					},
					{
						name: 'Convert File',
						value: 'convert',
						description: 'Convert a file to a different format',
						action: 'Convert a file',
					},
					{
						name: 'Create Archive',
						value: 'archive',
						description: 'Create an archive (ZIP, RAR...) for multiple files',
						action: 'Create archive',
					},
					{
						name: 'Create Thumbnail',
						value: 'thumbnail',
						description: 'Create a thumbnail of a file',
						action: 'Create a thumbnail',
					},
					{
						name: 'Get Metadata',
						value: 'metadata',
						description: 'Extract metadata from files',
						action: 'Get metadata from a file',
					},
					{
						name: 'Merge Files',
						value: 'merge',
						description: 'Merge multiple files into a single PDF',
						action: 'Merge files to PDF',
					},
					{
						name: 'Optimize File',
						value: 'optimize',
						description: 'Optimize / compress a file to reduce its size',
						action: 'Optimize a file',
					},
				],
				default: 'convert',
				noDataExpression: true,
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['convert', 'merge', 'archive', 'thumbnail', 'capture-website'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['operation'],
					loadOptionsMethod: 'loadOutputFormats',
				},
				placeholder: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description: 'Output format the file should be converted to',
			},
			/**
			 * Input file
			 */
			{
				displayName: 'Binary Input Data',
				name: 'inputBinaryData',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: [
							'convert',
							'merge',
							'archive',
							'thumbnail',
							'optimize',
							'metadata',
							'watermark',
						],
					},
				},
				description: 'Whether the input file to upload should be taken from binary field',
			},
			{
				displayName: 'Input File Content',
				name: 'inputFileContent',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'convert',
							'merge',
							'archive',
							'thumbnail',
							'optimize',
							'metadata',
							'watermark',
						],
						inputBinaryData: [false],
					},
				},
				placeholder: '',
				description: 'The text content of the file to upload',
			},
			{
				displayName: 'Input Filename',
				name: 'inputFilename',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'convert',
							'merge',
							'archive',
							'thumbnail',
							'optimize',
							'metadata',
							'watermark',
						],
						inputBinaryData: [false],
					},
				},
				placeholder: '',
				description: 'The input filename, including extension',
			},
			{
				displayName: 'Binary Property',
				name: 'inputBinaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'convert',
							'merge',
							'archive',
							'thumbnail',
							'optimize',
							'metadata',
							'watermark',
						],
						inputBinaryData: [true],
					},
				},
				placeholder: '',
				description:
					'Name of the binary property which contains the data for the file to be converted',
			},
			/**
			 * Operation specific options
			 */

			...captureWebsiteFields,
			...thumbnailFields,
			...watermarkFields,

			/**
			 * General additional options
			 */
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'json',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'convert',
							'thumbnail',
							'optimize',
							'metadata',
							'watermark',
							'capture-website',
						],
					},
				},
				placeholder: '{}',
				description:
					'JSON dictionary of additional options which will be added to the converting task. You can use the CloudConvert job builder to show and generate these options.',
			},
		],
	};

	methods = {
		loadOptions: {
			async loadOutputFormats(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const operation = this.getCurrentNodeParameter('operation') as string;
				const returnData: INodePropertyOptions[] = [];
				const { data } = await this.helpers.request({
					method: 'GET',
					json: true,
					url: `https://api.cloudconvert.com/v2/operations?filter[operation]=${operation}`,
				});

				for (const outputFormat of keys(keyBy(data, 'output_format'))) {
					returnData.push({
						name: outputFormat,
						value: outputFormat,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0);

		if (operation === 'convert') {
			return executeConvert.call(this);
		} else if (operation === 'thumbnail') {
			return executeThumbnail.call(this);
		} else if (operation === 'merge') {
			return executeMerge.call(this);
		} else if (operation === 'archive') {
			return executeArchive.call(this);
		} else if (operation === 'optimize') {
			return executeOptimize.call(this);
		} else if (operation === 'watermark') {
			return executeWatermark.call(this);
		} else if (operation === 'metadata') {
			return executeMetadata.call(this);
		} else if (operation === 'capture-website') {
			return executeCaptureWebsite.call(this);
		} else {
			throw new NodeOperationError(this.getNode(), `Invalid operation ${operation}`);
		}
	}
}
