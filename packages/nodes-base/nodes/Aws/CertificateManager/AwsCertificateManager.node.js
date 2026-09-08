import { NodeConnectionTypes } from 'n8n-workflow';
import { certificateFields, certificateOperations } from './CertificateDescription';
import { awsApiRequestAllItems, awsApiRequestREST } from './GenericFunctions';
import { awsNodeAuthOptions, awsNodeCredentials } from '../utils';
export class AwsCertificateManager {
    description = {
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
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: awsNodeCredentials,
        properties: [
            awsNodeAuthOptions,
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
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'certificate') {
                    //https://docs.aws.amazon.com/acm/latest/APIReference/API_DeleteCertificate.html
                    if (operation === 'delete') {
                        const certificateArn = this.getNodeParameter('certificateArn', i);
                        const body = {
                            CertificateArn: certificateArn,
                        };
                        responseData = await awsApiRequestREST.call(this, 'acm', 'POST', '', JSON.stringify(body), qs, {
                            'X-Amz-Target': 'CertificateManager.DeleteCertificate',
                            'Content-Type': 'application/x-amz-json-1.1',
                        });
                        responseData = { success: true };
                    }
                    //https://docs.aws.amazon.com/acm/latest/APIReference/API_GetCertificate.html
                    if (operation === 'get') {
                        const certificateArn = this.getNodeParameter('certificateArn', i);
                        const body = {
                            CertificateArn: certificateArn,
                        };
                        responseData = await awsApiRequestREST.call(this, 'acm', 'POST', '', JSON.stringify(body), qs, {
                            'X-Amz-Target': 'CertificateManager.GetCertificate',
                            'Content-Type': 'application/x-amz-json-1.1',
                        });
                    }
                    //https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
                    if (operation === 'getMany') {
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const options = this.getNodeParameter('options', i);
                        const body = {
                            CertificateStatuses: [],
                            Includes: {},
                            MaxItems: 0,
                        };
                        if (options.certificateStatuses) {
                            body.CertificateStatuses = options.certificateStatuses;
                        }
                        if (options.certificateStatuses) {
                            body.Includes.extendedKeyUsage = options.extendedKeyUsage;
                        }
                        if (options.keyTypes) {
                            body.Includes.keyTypes = options.keyTypes;
                        }
                        if (options.keyUsage) {
                            body.Includes.keyUsage = options.keyUsage;
                        }
                        if (returnAll) {
                            responseData = await awsApiRequestAllItems.call(this, 'CertificateSummaryList', 'acm', 'POST', '', '{}', qs, {
                                'X-Amz-Target': 'CertificateManager.ListCertificates',
                                'Content-Type': 'application/x-amz-json-1.1',
                            });
                        }
                        else {
                            body.MaxItems = this.getNodeParameter('limit', 0);
                            responseData = await awsApiRequestREST.call(this, 'acm', 'POST', '', JSON.stringify(body), qs, {
                                'X-Amz-Target': 'CertificateManager.ListCertificates',
                                'Content-Type': 'application/x-amz-json-1.1',
                            });
                            responseData = responseData.CertificateSummaryList;
                        }
                    }
                    //https://docs.aws.amazon.com/acm/latest/APIReference/API_DescribeCertificate.html
                    if (operation === 'getMetadata') {
                        const certificateArn = this.getNodeParameter('certificateArn', i);
                        const body = {
                            CertificateArn: certificateArn,
                        };
                        responseData = await awsApiRequestREST.call(this, 'acm', 'POST', '', JSON.stringify(body), qs, {
                            'X-Amz-Target': 'CertificateManager.DescribeCertificate',
                            'Content-Type': 'application/x-amz-json-1.1',
                        });
                        responseData = responseData.Certificate;
                    }
                    //https://docs.aws.amazon.com/acm/latest/APIReference/API_RenewCertificate.html
                    if (operation === 'renew') {
                        const certificateArn = this.getNodeParameter('certificateArn', i);
                        const body = {
                            CertificateArn: certificateArn,
                        };
                        responseData = await awsApiRequestREST.call(this, 'acm', 'POST', '', JSON.stringify(body), qs, {
                            'X-Amz-Target': 'CertificateManager.RenewCertificate',
                            'Content-Type': 'application/x-amz-json-1.1',
                        });
                        responseData = { success: true };
                    }
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    returnData.push(...executionData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=AwsCertificateManager.node.js.map