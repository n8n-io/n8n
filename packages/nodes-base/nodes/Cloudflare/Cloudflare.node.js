import { NodeConnectionTypes } from 'n8n-workflow';
import { cloudflareApiRequest, cloudflareApiRequestAllItems } from './GenericFunctions';
import { zoneCertificateFields, zoneCertificateOperations } from './ZoneCertificateDescription';
export class Cloudflare {
    description = {
        displayName: 'Cloudflare',
        name: 'cloudflare',
        icon: 'file:cloudflare.svg',
        group: ['input'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Cloudflare API',
        defaults: {
            name: 'Cloudflare',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'cloudflareApi',
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
                        name: 'Zone Certificate',
                        value: 'zoneCertificate',
                    },
                ],
                default: 'zoneCertificate',
            },
            ...zoneCertificateOperations,
            ...zoneCertificateFields,
        ],
    };
    methods = {
        loadOptions: {
            async getZones() {
                const returnData = [];
                const { result: zones } = await cloudflareApiRequest.call(this, 'GET', '/zones');
                for (const zone of zones) {
                    returnData.push({
                        name: zone.name,
                        value: zone.id,
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'zoneCertificate') {
                    //https://api.cloudflare.com/#zone-level-authenticated-origin-pulls-delete-certificate
                    if (operation === 'delete') {
                        const zoneId = this.getNodeParameter('zoneId', i);
                        const certificateId = this.getNodeParameter('certificateId', i);
                        responseData = await cloudflareApiRequest.call(this, 'DELETE', `/zones/${zoneId}/origin_tls_client_auth/${certificateId}`, {});
                        responseData = responseData.result;
                    }
                    //https://api.cloudflare.com/#zone-level-authenticated-origin-pulls-get-certificate-details
                    if (operation === 'get') {
                        const zoneId = this.getNodeParameter('zoneId', i);
                        const certificateId = this.getNodeParameter('certificateId', i);
                        responseData = await cloudflareApiRequest.call(this, 'GET', `/zones/${zoneId}/origin_tls_client_auth/${certificateId}`, {});
                        responseData = responseData.result;
                    }
                    //https://api.cloudflare.com/#zone-level-authenticated-origin-pulls-list-certificates
                    if (operation === 'getMany') {
                        const zoneId = this.getNodeParameter('zoneId', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const filters = this.getNodeParameter('filters', i, {});
                        Object.assign(qs, filters);
                        if (returnAll) {
                            responseData = await cloudflareApiRequestAllItems.call(this, 'result', 'GET', `/zones/${zoneId}/origin_tls_client_auth`, {}, qs);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            Object.assign(qs, { per_page: limit });
                            responseData = await cloudflareApiRequest.call(this, 'GET', `/zones/${zoneId}/origin_tls_client_auth`, {}, qs);
                            responseData = responseData.result;
                        }
                    }
                    //https://api.cloudflare.com/#zone-level-authenticated-origin-pulls-upload-certificate
                    if (operation === 'upload') {
                        const zoneId = this.getNodeParameter('zoneId', i);
                        const certificate = this.getNodeParameter('certificate', i);
                        const privateKey = this.getNodeParameter('privateKey', i);
                        const body = {
                            certificate,
                            private_key: privateKey,
                        };
                        responseData = await cloudflareApiRequest.call(this, 'POST', `/zones/${zoneId}/origin_tls_client_auth`, body, qs);
                        responseData = responseData.result;
                    }
                }
                returnData.push(...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), {
                    itemData: { item: i },
                }));
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
//# sourceMappingURL=Cloudflare.node.js.map