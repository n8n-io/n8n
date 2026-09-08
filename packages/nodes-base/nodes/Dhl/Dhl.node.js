import { NodeConnectionTypes, } from 'n8n-workflow';
import { dhlApiRequest, validateCredentials } from './GenericFunctions';
export class Dhl {
    description = {
        displayName: 'DHL',
        name: 'dhl',
        icon: 'file:dhl.svg',
        group: ['input'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume DHL API',
        defaults: {
            name: 'DHL',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'dhlApi',
                required: true,
                testedBy: 'dhlApiCredentialTest',
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                noDataExpression: true,
                type: 'hidden',
                options: [
                    {
                        name: 'Shipment',
                        value: 'shipment',
                    },
                ],
                default: 'shipment',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['shipment'],
                    },
                },
                options: [
                    {
                        name: 'Get Tracking Details',
                        value: 'get',
                        action: 'Get tracking details for a shipment',
                    },
                ],
                default: 'get',
            },
            {
                displayName: 'Tracking Number',
                name: 'trackingNumber',
                type: 'string',
                required: true,
                default: '',
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add option',
                default: {},
                options: [
                    {
                        displayName: "Recipient's Postal Code",
                        name: 'recipientPostalCode',
                        type: 'string',
                        default: '',
                        description: "DHL will return more detailed information on the shipment when you provide the Recipient's Postal Code - it acts as a verification step",
                    },
                ],
            },
        ],
    };
    methods = {
        credentialTest: {
            async dhlApiCredentialTest(credential) {
                try {
                    await validateCredentials.call(this, credential.data);
                }
                catch (error) {
                    if (error.statusCode === 401) {
                        return {
                            status: 'Error',
                            message: 'The API Key included in the request is invalid',
                        };
                    }
                }
                return {
                    status: 'OK',
                    message: 'Connection successful!',
                };
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        let qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'shipment') {
                    if (operation === 'get') {
                        const trackingNumber = this.getNodeParameter('trackingNumber', i);
                        const options = this.getNodeParameter('options', i);
                        qs = {
                            trackingNumber,
                        };
                        Object.assign(qs, options);
                        responseData = await dhlApiRequest.call(this, 'GET', '/track/shipments', {}, qs);
                        returnData.push(...responseData.shipments);
                    }
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.description });
                    continue;
                }
                throw error;
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=Dhl.node.js.map