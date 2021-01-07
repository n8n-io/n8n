import { 
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as fllate from 'fflate';

import * as mime from 'mime-types';

export class Compression implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Compression',
		name: 'compression',
		icon: 'fa:file-archive',
		group: ['transform'],
		subtitle: '={{$parameter["operation"]}}',
		version: 1,
		description: 'Compress and uncompress files',
		defaults: {
			name: 'Compression',
			color: '#408000',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Compress',
						value: 'compress',
					},
					{
						name: 'Decompress',
						value: 'decompress',
					},
				],
				default: 'decompress',
			},
			{
				displayName: 'Input Format',
				name: 'inputFormat',
				type: 'options',
				default: '',
				options: [
					{
						name: 'gzip',
						value: 'gzip',
					},
					{
						name: 'zip',
						value: 'zip',
					},
				],
				displayOptions: {
					show: {
						operation: [
							'decompress',
						],
					},
				},
				description: 'Format of the input file',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'compress',
							'decompress',
						],
					},
		
				},
				placeholder: '',
				description: 'Name of the binary property which contains<br />the data for the file(s) to be compress/decompress. Multiple can be used separated by ,',
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				default: '',
				options: [
					{
						name: 'gzip',
						value: 'gzip',
					},
					{
						name: 'zip',
						value: 'zip',
					},
				],
				displayOptions: {
					show: {
						operation: [
							'compress',
						],
					},
				},
				description: 'Format of the output file',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'data.zip',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'compress',
						],
						outputFormat: [
							'zip',
						],
					},
		
				},
				description: 'Name of the file to be compressed',
			},
			{
				displayName: 'Binary Property Output',
				name: 'binaryPropertyOutput',
				type: 'string',
				default: 'data',
				required: false,
				displayOptions: {
					show: {
						outputFormat: [
							'zip',
						],
						operation: [
							'compress',
						],
					},
				},
				placeholder: '',
				description: 'Name of the binary property to which to<br />write the data of the compressed files.',
			},
			{
				displayName: 'Output Prefix',
				name: 'outputPrefix',
				type: 'string',
				default: 'data_',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'compress',
						],
						outputFormat: [
							'gzip',
						],
					},
				},
				description: 'Prefix use for all gzip compresed files',
			},
			{
				displayName: 'Output Prefix',
				name: 'outputPrefix',
				type: 'string',
				default: 'file_',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'decompress',
						],
					},
				},
				description: 'Prefix use for all decompressed files',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {

			if (operation === 'decompress') {
				const binaryPropertyNames = (this.getNodeParameter('binaryPropertyName', 0) as string).split(',');

				const inputFormat =  this.getNodeParameter('inputFormat', 0) as string;

				const outputPrefix =  this.getNodeParameter('outputPrefix', 0) as string;

				const binaryObject: IBinaryKeyData = {};

				for (const [index, binaryPropertyName] of binaryPropertyNames.entries()) {
					if (items[i].binary === undefined) {
						throw new Error('No binary data exists on item!');
					}
					//@ts-ignore
					if (items[i].binary[binaryPropertyName] === undefined) {
						throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
					}
	
					const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];

					if (inputFormat === 'zip') {
						const files = fllate.unzipSync(Buffer.from(binaryData.data as string, BINARY_ENCODING));

						let zipIndex = 0;

						for (const key of Object.keys(files)) {

							// when files are compresed using MACOSX for some reason they are duplicated under __MACOSX
							if (key.includes('__MACOSX')) {
								continue;
							}

							const buffer = files[key].buffer;
							
							const data = await this.helpers.prepareBinaryData(Buffer.from(buffer), key);
							
							binaryObject[`${outputPrefix}${index}_${zipIndex}`] = data;

							zipIndex++;
						}

					} else if (inputFormat === 'gzip') {
						const file = fllate.gunzipSync(Buffer.from(binaryData.data as string, BINARY_ENCODING));
						
						const fileName = binaryData.fileName?.split('.')[0];
						
						binaryObject[`${outputPrefix}${index}`] = await this.helpers.prepareBinaryData(Buffer.from(file.buffer), fileName);

						const fileExtension = mime.extension(binaryObject[`${outputPrefix}${index}`].mimeType) as string;

						binaryObject[`${outputPrefix}${index}`].fileName = `${fileName}.${fileExtension}`;

						binaryObject[`${outputPrefix}${index}`].fileExtension = fileExtension;
					}
				}

				returnData.push({
					json: {},
					binary: binaryObject,
				});
			}

			if (operation === 'compress') {
				const binaryPropertyNames = (this.getNodeParameter('binaryPropertyName', 0) as string).split(',');

				const outputFormat = this.getNodeParameter('outputFormat', 0) as string;

				const zipData: fllate.Zippable = {};
				
				const binaryObject: IBinaryKeyData = {};

				for (const [index, binaryPropertyName] of binaryPropertyNames.entries()) {

					if (items[i].binary === undefined) {
						throw new Error('No binary data exists on item!');
					}
					//@ts-ignore
					if (items[i].binary[binaryPropertyName] === undefined) {
						throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
					}

					const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];

					const ALREADY_COMPRESSED = [
						'zip', 'gz', 'png', 'jpg', 'jpeg', 'pdf', 'doc', 'docx', 'ppt', 'pptx',
						'xls', 'xlsx', 'heic', 'heif', '7z', 'bz2', 'rar', 'gif', 'webp', 'webm',
						'mp4', 'mov', 'mp3', 'aifc',
					];

					if (outputFormat === 'zip') {
						zipData[binaryData.fileName as string] = [
							Buffer.from(binaryData.data, BINARY_ENCODING), {
								level: ALREADY_COMPRESSED.includes(binaryData.fileExtension as string) ? 0 : 6,
							},
						];
					
					} else if (outputFormat === 'gzip') {
						const outputPrefix =  this.getNodeParameter('outputPrefix', 0) as string;
						
						const data = fllate.gzipSync(Buffer.from(binaryData.data, BINARY_ENCODING));
						
						const fileName = binaryData.fileName?.split('.')[0];

						binaryObject[`${outputPrefix}${index}`] = await this.helpers.prepareBinaryData(Buffer.from(data), `${fileName}.gzip`);
					}
				}

				if (outputFormat === 'zip') {
					const fileName = this.getNodeParameter('fileName', 0) as string;

					const binaryPropertyOutput = this.getNodeParameter('binaryPropertyOutput', 0) as string;
					
					const buffer = fllate.zipSync(zipData);

					const data = await this.helpers.prepareBinaryData(Buffer.from(buffer), fileName);
	
					returnData.push({
						json: {},
						binary: {
							[binaryPropertyOutput]: data,
						},
					});
				}

				if (outputFormat === 'gzip') {
					returnData.push({
						json: {},
						binary: binaryObject,
					});
				}
			}
		}

		return this.prepareOutputData(returnData);
	}
}
