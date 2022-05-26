import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeOperationError,
} from 'n8n-workflow';
import { citrixADCApiRequest } from './GenericFunctions';
import { certificateDescription } from './CertificateDescription';
import { OptionsWithUri } from 'request';

export class CitrixADC implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Citrix ADC',
		name: 'citrixADC',
		icon: 'file:citrix.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Citrix ADC API',
		defaults: {
			name: 'Citrix ADC',
		},
		credentials: [
			{
				name: 'citrixADCApi',
				required: true,
				testedBy: 'citrixADCCredentialTest',
			},
		],
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Certificate',
						value: 'certificate',
					},
				],
				default: 'certificate',
			},
			...certificateDescription,
		],
	};

	methods = {
		credentialTest: {
			async citrixADCCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const { username, password, url } = credential.data as IDataObject;

				const options: OptionsWithUri = {
					headers: {
						'Content-Type': 'application/json',
						'X-NITRO-USER': username,
						'X-NITRO-PASS': password,
					},
					method: 'GET',
					uri: `${url}/nitro/v1/config/nspartition?view=summary`,
					json: true,
				};

				try {
					await this.helpers.request(options);
					return {
						status: 'OK',
						message: 'Authentication successful',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: (error as JsonObject).message as string,
					};
				}
			},
		},
		loadOptions: {
			async getPartitions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [
					{
						name: 'Default',
						value: '/nsconfig/ssl/',
					},
				];

				const { nspartition } = await citrixADCApiRequest.call(
					this,
					'GET',
					`/config/nspartition?view=summary`,
				);

				if (nspartition) {
					(nspartition as IDataObject[]).forEach((partition) => {
						returnData.push({
							name: partition.partitionname as string,
							value: `/nsconfig/partitions/${partition.partitionname}/ssl/`,
						});
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				// Certificate --------------------------------------------------------------------------
				if (resource === 'certificate') {
					if (operation === 'upload') {
						const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const endpoint = `/config/systemfile`;

						const item = items[i];

						if (item.binary === undefined) {
							throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
						}

						if (item.binary[binaryProperty] === undefined) {
							throw new NodeOperationError(
								this.getNode(),
								`No binary data property "${binaryProperty}" does not exists on item!`,
							);
						}

						const body = {
							systemfile: {
								filename: item.binary[binaryProperty].fileName,
								filecontent: item.binary[binaryProperty].data,
								filelocation: '/nsconfig/ssl/',
								fileencoding: 'BASE64',
							},
						};

						if (options.fileName) {
							body.systemfile.filename = options.fileName as string;
						}

						if (options.fileEncoding) {
							body.systemfile.fileencoding = options.fileEncoding as string;
						}

						if (options.partition) {
							body.systemfile.filelocation = options.partition as string;
						}

						await citrixADCApiRequest.call(this, 'POST', endpoint, body);
						returnData.push({ success: true });
					}
					if (operation === 'delete') {
						const fileName = this.getNodeParameter('fileName', i) as string;
						const fileLocation = this.getNodeParameter('partition', i) as string;

						const endpoint = `/config/systemfile?args=filename:${fileName},filelocation:${encodeURIComponent(
							fileLocation,
						)}`;

						await citrixADCApiRequest.call(this, 'DELETE', endpoint);
						returnData.push({ success: true });
					}
					if (operation === 'download') {
						const fileName = this.getNodeParameter('fileName', i) as string;
						const fileLocation = this.getNodeParameter('partition', i) as string;

						const endpoint = `/config/systemfile?args=filename:${fileName},filelocation:${encodeURIComponent(
							fileLocation,
						)}`;

						const { systemfile } = await citrixADCApiRequest.call(this, 'GET', endpoint);

						for (const file of systemfile) {
							const binaryData = await this.helpers.prepareBinaryData(
								file.filecontent,
								file.filename,
								'text/plain',
							);
							delete file.filecontent;
							returnData.push({
								json: file,
								binary: {
									data: binaryData,
								},
							});
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).toString() });
					continue;
				}

				throw error;
			}
		}

		if (operation === 'download') {
			return this.prepareOutputData(returnData as unknown as INodeExecutionData[]);
		} else {
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
