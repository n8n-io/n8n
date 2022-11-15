import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { certificateFields, certificateOperations } from './CertificateDescription';

import { awsApiRequestAllItems, awsApiRequestREST } from './GenericFunctions';

export class AwsCertificateManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Certificate Manager',
		name: 'awsCertificateManager',
		icon: 'file:acm.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to AWS Certificate Manager',
		defaults: {
			name: 'AWS Certificate Manager',
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
						name: 'Certificate',
						value: 'certificate',
					},
				],
				default: 'certificate',
			},
			// Certificate
			...certificateOperations,
			...certificateFields,
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
			try {
				if (resource === 'certificate') {
					//https://docs.aws.amazon.com/acm/latest/APIReference/API_DeleteCertificate.html
					if (operation === 'delete') {
						const certificateArn = this.getNodeParameter('certificateArn', i) as string;

						const body: IDataObject = {
							CertificateArn: certificateArn,
						};

						responseData = await awsApiRequestREST.call(
							this,
							`acm`,
							'POST',
							'',
							JSON.stringify(body),
							qs,
							{
								'X-Amz-Target': 'CertificateManager.DeleteCertificate',
								'Content-Type': 'application/x-amz-json-1.1',
							},
						);

						responseData = { success: true };
					}

					//https://docs.aws.amazon.com/acm/latest/APIReference/API_GetCertificate.html
					if (operation === 'get') {
						const certificateArn = this.getNodeParameter('certificateArn', i) as string;

						const body: IDataObject = {
							CertificateArn: certificateArn,
						};

						responseData = await awsApiRequestREST.call(
							this,
							`acm`,
							'POST',
							'',
							JSON.stringify(body),
							qs,
							{
								'X-Amz-Target': 'CertificateManager.GetCertificate',
								'Content-Type': 'application/x-amz-json-1.1',
							},
						);
					}

					//https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;

						const body: { Includes: IDataObject; CertificateStatuses: string[]; MaxItems: number } = {
							CertificateStatuses: [],
							Includes: {},
							MaxItems: 0,
						};

						if (options.certificateStatuses) {
							body.CertificateStatuses = options.certificateStatuses as string[];
						}

						if (options.certificateStatuses) {
							body.Includes['extendedKeyUsage'] = options.extendedKeyUsage as string[];
						}

						if (options.keyTypes) {
							body.Includes['keyTypes'] = options.keyTypes as string[];
						}

						if (options.keyUsage) {
							body.Includes['keyUsage'] = options.keyUsage as string[];
						}

						if (returnAll) {
							responseData = await awsApiRequestAllItems.call(
								this,
								'CertificateSummaryList',
								'acm',
								'POST',
								'',
								'{}',
								qs,
								{
									'X-Amz-Target': 'CertificateManager.ListCertificates',
									'Content-Type': 'application/x-amz-json-1.1',
								},
							);
						} else {
							body.MaxItems = this.getNodeParameter('limit', 0) as number;
							responseData = await awsApiRequestREST.call(
								this,
								`acm`,
								'POST',
								'',
								JSON.stringify(body),
								qs,
								{
									'X-Amz-Target': 'CertificateManager.ListCertificates',
									'Content-Type': 'application/x-amz-json-1.1',
								},
							);
							responseData = responseData.CertificateSummaryList;
						}
					}

					//https://docs.aws.amazon.com/acm/latest/APIReference/API_DescribeCertificate.html
					if (operation === 'getMetadata') {
						const certificateArn = this.getNodeParameter('certificateArn', i) as string;

						const body: IDataObject = {
							CertificateArn: certificateArn,
						};

						responseData = await awsApiRequestREST.call(
							this,
							`acm`,
							'POST',
							'',
							JSON.stringify(body),
							qs,
							{
								'X-Amz-Target': 'CertificateManager.DescribeCertificate',
								'Content-Type': 'application/x-amz-json-1.1',
							},
						);

						responseData = responseData.Certificate;
					}

					//https://docs.aws.amazon.com/acm/latest/APIReference/API_RenewCertificate.html
					if (operation === 'renew') {
						const certificateArn = this.getNodeParameter('certificateArn', i) as string;

						const body: IDataObject = {
							CertificateArn: certificateArn,
						};

						responseData = await awsApiRequestREST.call(
							this,
							`acm`,
							'POST',
							'',
							JSON.stringify(body),
							qs,
							{
								'X-Amz-Target': 'CertificateManager.RenewCertificate',
								'Content-Type': 'application/x-amz-json-1.1',
							},
						);

						responseData = { success: true };
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData as INodeExecutionData[]];
	}
}
