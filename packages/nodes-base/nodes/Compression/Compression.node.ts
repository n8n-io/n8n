import { promisify } from 'util';
import type {
	IBinaryKeyData,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as fflate from 'fflate';

const gunzip = promisify(fflate.gunzip);
const gzip = promisify(fflate.gzip);
const unzip = promisify(fflate.unzip);
const zip = promisify(fflate.zip);

import * as mime from 'mime-types';

const ALREADY_COMPRESSED = [
	'7z',
	'aifc',
	'bz2',
	'doc',
	'docx',
	'gif',
	'gz',
	'heic',
	'heif',
	'jpg',
	'jpeg',
	'mov',
	'mp3',
	'mp4',
	'pdf',
	'png',
	'ppt',
	'pptx',
	'rar',
	'webm',
	'webp',
	'xls',
	'xlsx',
	'zip',
];

export class Compression implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Compression',
		name: 'compression',
		icon: 'fa:file-archive',
		iconColor: 'green',
		group: ['transform'],
		subtitle: '={{$parameter["operation"]}}',
		version: [1, 1.1],
		description: 'Compress and decompress files',
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
				noDataExpression: true,
				options: [
					{
						name: 'Compress',
						value: 'compress',
						action: 'Compress file(s)',
						description: 'Compress files into a zip or gzip archive',
					},
					{
						name: 'Decompress',
						value: 'decompress',
						action: 'Decompress file(s)',
						description: 'Decompress zip or gzip archives',
					},
				],
				default: 'decompress',
			},
			{
				displayName: 'Input Binary Field(s)',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['compress'],
					},
				},
				placeholder: 'e.g. data,data2,data3',
				hint: 'The name of the input binary field(s) containing the file(s) to be compressed',
				description:
					'To process more than one file, use a comma-separated list of the binary fields names',
			},
			{
				displayName: 'Input Binary Field(s)',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['decompress'],
					},
				},
				placeholder: 'e.g. data',
				hint: 'The name of the input binary field(s) containing the file(s) to decompress',
				description:
					'To process more than one file, use a comma-separated list of the binary fields names',
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Gzip',
						value: 'gzip',
					},
					{
						name: 'Zip',
						value: 'zip',
					},
				],
				displayOptions: {
					show: {
						operation: ['compress'],
						'@version': [1],
					},
				},
				description: 'Format of the output',
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				default: 'zip',
				options: [
					{
						name: 'Gzip',
						value: 'gzip',
					},
					{
						name: 'Zip',
						value: 'zip',
					},
				],
				displayOptions: {
					show: {
						operation: ['compress'],
					},
					hide: {
						'@version': [1],
					},
				},
				description: 'Format of the output',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. data.zip',
				required: true,
				displayOptions: {
					show: {
						operation: ['compress'],
						outputFormat: ['zip'],
					},
				},
				description: 'Name of the output file',
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyOutput',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						outputFormat: ['zip'],
						operation: ['compress'],
					},
				},
				hint: 'The name of the output binary field to put the file in',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. data.txt',
				displayOptions: {
					show: {
						operation: ['compress'],
						outputFormat: ['gzip'],
					},
					hide: {
						'@version': [1],
					},
				},
				description: 'Name of the output file',
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyOutput',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						outputFormat: ['gzip'],
						operation: ['compress'],
					},
					hide: {
						'@version': [1],
					},
				},
				hint: 'The name of the output binary field to put the file in',
			},
			{
				displayName: 'Output File Prefix',
				name: 'outputPrefix',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['compress'],
						outputFormat: ['gzip'],
						'@version': [1],
					},
				},
				description: 'Prefix to add to the gzip file',
			},
			{
				displayName: 'Output Prefix',
				name: 'outputPrefix',
				type: 'string',
				default: 'file_',
				required: true,
				displayOptions: {
					show: {
						operation: ['decompress'],
					},
				},
				description: 'Prefix to add to the decompressed files',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0);
		const nodeVersion = this.getNode().typeVersion;

		for (let i = 0; i < length; i++) {
			try {
				if (operation === 'decompress') {
					const binaryPropertyNames = this.getNodeParameter('binaryPropertyName', 0)
						.split(',')
						.map((key) => key.trim());

					const outputPrefix = this.getNodeParameter('outputPrefix', 0) as string;

					const binaryObject: IBinaryKeyData = {};

					let zipIndex = 0;

					for (const [index, binaryPropertyName] of binaryPropertyNames.entries()) {
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						if (binaryData.fileExtension?.toLowerCase() === 'zip') {
							const files = await unzip(binaryDataBuffer);

							for (const key of Object.keys(files)) {
								// when files are compressed using MACOSX for some reason they are duplicated under __MACOSX
								if (key.includes('__MACOSX')) {
									continue;
								}

								const data = await this.helpers.prepareBinaryData(
									Buffer.from(files[key].buffer),
									key,
								);

								binaryObject[`${outputPrefix}${zipIndex++}`] = data;
							}
						} else if (['gz', 'gzip'].includes(binaryData.fileExtension?.toLowerCase() as string)) {
							const file = await gunzip(binaryDataBuffer);

							const fileName = binaryData.fileName?.split('.')[0];
							let fileExtension;
							let mimeType;

							if (binaryData.fileName?.endsWith('.gz')) {
								const extractedFileExtension = binaryData.fileName.replace('.gz', '').split('.');
								if (extractedFileExtension.length > 1) {
									fileExtension = extractedFileExtension[extractedFileExtension.length - 1];
									mimeType = mime.lookup(fileExtension) as string;
								}
							}

							const propertyName = `${outputPrefix}${index}`;

							binaryObject[propertyName] = await this.helpers.prepareBinaryData(
								Buffer.from(file.buffer),
								fileName,
								mimeType,
							);

							if (!fileExtension) {
								mimeType = binaryObject[propertyName].mimeType;
								fileExtension = mime.extension(mimeType) as string;
							}

							binaryObject[propertyName].fileName = `${fileName}.${fileExtension}`;
							binaryObject[propertyName].fileExtension = fileExtension;
							binaryObject[propertyName].mimeType = mimeType as string;
						}
					}

					returnData.push({
						json: items[i].json,
						binary: binaryObject,
						pairedItem: {
							item: i,
						},
					});
				}

				if (operation === 'compress') {
					let binaryPropertyNameIndex = 0;
					if (nodeVersion > 1) {
						binaryPropertyNameIndex = i;
					}

					const binaryPropertyNames = this.getNodeParameter(
						'binaryPropertyName',
						binaryPropertyNameIndex,
					)
						.split(',')
						.map((key) => key.trim());

					const outputFormat = this.getNodeParameter('outputFormat', 0) as string;

					const zipData: fflate.Zippable = {};
					const binaryObject: IBinaryKeyData = {};

					for (const [index, binaryPropertyName] of binaryPropertyNames.entries()) {
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						if (outputFormat === 'zip') {
							zipData[binaryData.fileName as string] = [
								binaryDataBuffer,
								{
									level: ALREADY_COMPRESSED.includes(binaryData.fileExtension as string) ? 0 : 6,
								},
							];
						} else if (outputFormat === 'gzip') {
							let outputPrefix;
							let fileName;
							let binaryProperty;
							let filePath;

							if (nodeVersion > 1) {
								outputPrefix = this.getNodeParameter('binaryPropertyOutput', i, 'data');
								binaryProperty = `${outputPrefix}${index ? index : ''}`;

								fileName = this.getNodeParameter('fileName', i, '') as string;
								if (!fileName) {
									fileName = binaryData.fileName?.split('.')[0];
								} else {
									fileName = fileName.replace('.gz', '').replace('.gzip', '');
								}

								const fileExtension = binaryData.fileExtension
									? `.${binaryData.fileExtension.toLowerCase()}`
									: '';
								filePath = `${fileName}${fileExtension}.gz`;
							} else {
								outputPrefix = this.getNodeParameter('outputPrefix', 0) as string;
								binaryProperty = `${outputPrefix}${index}`;
								fileName = binaryData.fileName?.split('.')[0];
								filePath = `${fileName}.gzip`;
							}

							const data = await gzip(binaryDataBuffer);

							binaryObject[binaryProperty] = await this.helpers.prepareBinaryData(
								Buffer.from(data),
								filePath,
							);
						}
					}

					if (outputFormat === 'zip') {
						let zipOptionsIndex = 0;
						if (nodeVersion > 1) {
							zipOptionsIndex = i;
						}
						const fileName = this.getNodeParameter('fileName', zipOptionsIndex) as string;
						const binaryPropertyOutput = this.getNodeParameter(
							'binaryPropertyOutput',
							zipOptionsIndex,
						);
						const buffer = await zip(zipData);
						const data = await this.helpers.prepareBinaryData(Buffer.from(buffer), fileName);

						returnData.push({
							json: items[i].json,
							binary: {
								[binaryPropertyOutput]: data,
							},
							pairedItem: {
								item: i,
							},
						});
					}

					if (outputFormat === 'gzip') {
						returnData.push({
							json: items[i].json,
							binary: binaryObject,
							pairedItem: {
								item: i,
							},
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
