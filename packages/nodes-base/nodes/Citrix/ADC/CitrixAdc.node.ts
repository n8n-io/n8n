import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { citrixADCApiRequest } from './GenericFunctions';

import { fileDescription } from './FileDescription';

import { certificateDescription } from './CertificateDescription';

export class CitrixAdc implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Citrix ADC',
		name: 'citrixAdc',
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
				name: 'citrixAdcApi',
				required: true,
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
					{
						name: 'File',
						value: 'file',
					},
				],
				default: 'file',
			},
			...certificateDescription,
			...fileDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		let responseData: IDataObject | IDataObject[] = {};

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'file') {
					if (operation === 'upload') {
						const fileLocation = this.getNodeParameter('fileLocation', i) as string;
						const binaryProperty = this.getNodeParameter('binaryProperty', i);
						const options = this.getNodeParameter('options', i);
						const endpoint = '/config/systemfile';

						const item = items[i];

						if (item.binary === undefined) {
							throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
						}

						if (item.binary[binaryProperty] === undefined) {
							throw new NodeOperationError(
								this.getNode(),
								`The binary data property "${binaryProperty}" does not exists on item!`,
							);
						}

						const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);

						const body = {
							systemfile: {
								filename: item.binary[binaryProperty].fileName,
								filecontent: Buffer.from(buffer).toString('base64'),
								filelocation: fileLocation,
								fileencoding: 'BASE64',
							},
						};

						if (options.fileName) {
							body.systemfile.filename = options.fileName as string;
						}

						await citrixADCApiRequest.call(this, 'POST', endpoint, body);
						responseData = { success: true };
					}
					if (operation === 'delete') {
						const fileName = this.getNodeParameter('fileName', i) as string;
						const fileLocation = this.getNodeParameter('fileLocation', i) as string;

						const endpoint = `/config/systemfile?args=filename:${fileName},filelocation:${encodeURIComponent(
							fileLocation,
						)}`;

						await citrixADCApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					}
					if (operation === 'download') {
						const fileName = this.getNodeParameter('fileName', i) as string;
						const fileLocation = this.getNodeParameter('fileLocation', i) as string;
						const binaryProperty = this.getNodeParameter('binaryProperty', i);

						const endpoint = `/config/systemfile?args=filename:${fileName},filelocation:${encodeURIComponent(
							fileLocation,
						)}`;

						const { systemfile } = await citrixADCApiRequest.call(this, 'GET', endpoint);

						const file = systemfile[0];

						const binaryData = await this.helpers.prepareBinaryData(
							Buffer.from(file.filecontent, 'base64'),
							file.filename,
						);

						responseData = {
							json: file,
							binary: {
								[binaryProperty]: binaryData,
							},
						};
					}
				}

				if (resource === 'certificate') {
					if (operation === 'create') {
						const certificateFileName = this.getNodeParameter('certificateFileName', i) as string;
						const certificateFormat = this.getNodeParameter('certificateFormat', i) as string;
						const certificateType = this.getNodeParameter('certificateType', i) as string;
						const certificateRequestFileName = this.getNodeParameter(
							'certificateRequestFileName',
							i,
						) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {});

						let body: IDataObject = {
							reqfile: certificateRequestFileName,
							certfile: certificateFileName,
							certform: certificateFormat,
							certType: certificateType,
							...additionalFields,
						};

						if (certificateType === 'ROOT_CERT') {
							const privateKeyFileName = this.getNodeParameter('privateKeyFileName', i) as string;
							body = {
								...body,
								keyfile: privateKeyFileName,
							};
						} else {
							const caCertificateFileName = this.getNodeParameter(
								'caCertificateFileName',
								i,
							) as string;
							const caCertificateFileFormat = this.getNodeParameter(
								'caCertificateFileFormat',
								i,
							) as string;
							const caPrivateKeyFileFormat = this.getNodeParameter(
								'caPrivateKeyFileFormat',
								i,
							) as string;
							const caPrivateKeyFileName = this.getNodeParameter(
								'caPrivateKeyFileName',
								i,
							) as string;
							const caSerialFileNumber = this.getNodeParameter('caSerialFileNumber', i) as string;

							body = {
								...body,
								cacert: caCertificateFileName,
								cacertform: caCertificateFileFormat,
								cakey: caPrivateKeyFileName,
								cakeyform: caPrivateKeyFileFormat,
								caserial: caSerialFileNumber,
							};
						}

						const endpoint = '/config/sslcert?action=create';

						await citrixADCApiRequest.call(this, 'POST', endpoint, { sslcert: body });

						responseData = { success: true };
					}

					if (operation === 'install') {
						const certificateKeyPairName = this.getNodeParameter(
							'certificateKeyPairName',
							i,
						) as string;
						const certificateFileName = this.getNodeParameter('certificateFileName', i) as string;
						const privateKeyFileName = this.getNodeParameter('privateKeyFileName', i) as string;
						const certificateFormat = this.getNodeParameter('certificateFormat', i) as string;
						const notifyExpiration = this.getNodeParameter('notifyExpiration', i) as boolean;
						const body: IDataObject = {
							cert: certificateFileName,
							certkey: certificateKeyPairName,
							key: privateKeyFileName,
							inform: certificateFormat,
						};

						if (certificateFormat === 'PEM') {
							const password = this.getNodeParameter('password', i) as string;
							const certificateBundle = this.getNodeParameter('certificateBundle', i) as boolean;
							Object.assign(body, {
								passplain: password,
								bundle: certificateBundle ? 'YES' : 'NO',
							});
						}

						if (notifyExpiration) {
							const notificationPeriod = this.getNodeParameter('notificationPeriod', i) as number;
							Object.assign(body, {
								expirymonitor: 'ENABLED',
								notificationperiod: notificationPeriod,
							});
						}

						const endpoint = '/config/sslcertkey';

						await citrixADCApiRequest.call(this, 'POST', endpoint, { sslcertkey: body });

						responseData = { success: true };
					}
				}

				returnData.push(
					...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), {
						itemData: { item: i },
					}),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).toString() });
					continue;
				}

				throw error;
			}
		}

		return [returnData as INodeExecutionData[]];
	}
}
