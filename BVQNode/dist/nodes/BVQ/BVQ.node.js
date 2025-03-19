"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BVQ = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class BVQ {
    constructor() {
        this.description = {
            displayName: 'BVQ',
            name: 'bvq',
            icon: 'file:bvq.png',
            group: ['transform'],
            version: 1,
            subtitle: 'Get BVQ Data',
            description: 'Get data from the BVQ API',
            defaults: {
                name: 'BVQ',
            },
            inputs: ["main"],
            outputs: ["main"],
            credentials: [
                {
                    name: 'bvqApi',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Data Type',
                    name: 'datatype',
                    description: 'Select the data type you want to retrieve from the BVQ API',
                    type: 'options',
                    default: 'alerts',
                    options: [
                        {
                            name: 'Alerts',
                            value: 'alerts',
                            description: 'Returns the latest alerts',
                        },
                    ],
                    required: true,
                },
                {
                    displayName: 'Timestamp',
                    name: 'timestamp',
                    description: 'Specifies the starting point of the time period from which you want to retrieve data, up to now, as a Unix timestamp in seconds',
                    type: 'string',
                    default: '',
                    placeholder: 'Unix Timestamp in Seconds',
                    required: true,
                    displayOptions: {
                        show: {
                            datatype: ['alerts'],
                        },
                    },
                    routing: {
                        request: {
                            qs: {
                                q: '={{$value}}',
                            },
                        },
                    },
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('bvqApi', 0);
        if (!credentials) {
            throw new n8n_workflow_1.ApplicationError('Missing credentials for BVQ API.');
        }
        const { username, password, apiBaseURL, ignoreSslIssues } = credentials;
        const dataType = this.getNodeParameter('datatype', 0);
        const apiUrl = apiBaseURL.replace(/\/$/, '') + `/${dataType}`;
        for (let i = 0; i < items.length; i++) {
            try {
                const response = await this.helpers.request({
                    method: 'GET',
                    url: apiUrl,
                    rejectUnauthorized: !ignoreSslIssues,
                    auth: { username, password },
                    headers: { 'Content-Type': 'application/json' },
                });
                const jsonResponse = typeof response === 'string' ? JSON.parse(response) : response;
                returnData.push({ json: jsonResponse });
            }
            catch (error) {
                throw new n8n_workflow_1.ApplicationError(`BVQ API Request Failed: ${error.message}`);
            }
        }
        return [returnData];
    }
}
exports.BVQ = BVQ;
//# sourceMappingURL=Bvq.node.js.map