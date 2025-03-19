import {
    ApplicationError,
    NodeConnectionType,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class BVQ implements INodeType {
	description: INodeTypeDescription = {
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
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
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
                        value: 'alerts', // Must be the exact URL-Ending for the API
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
                        datatype: ['alerts'],  // Shows only when "alerts" is selected
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

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

        // Retrieve credentials
        const credentials = await this.getCredentials('bvqApi', 0);
        if (!credentials) {
            throw new ApplicationError('Missing credentials for BVQ API.');
        }

        const { username, password, apiBaseURL, ignoreSslIssues } = credentials as { username: string; password: string; apiBaseURL: string; ignoreSslIssues: boolean };

        // Retrieve node parameters (only once)
        const dataType = this.getNodeParameter('datatype', 0) as string;

        // Ensure API URL is properly formatted
        const apiUrl = apiBaseURL.replace(/\/$/, '') + `/${dataType}`;

		for (let i = 0; i < items.length; i++) {
            //const allowUnauthorizedCerts = this.getNodeParameter('options.allowUnauthorizedCerts', i, false) as boolean;

			try {
				const response = await this.helpers.request({
					method: 'GET',
					url: apiUrl,
					rejectUnauthorized: !ignoreSslIssues,
					auth: { username, password },
					headers: { 'Content-Type': 'application/json' },
				});

                // Ensure the response is parsed JSON
                const jsonResponse = typeof response === 'string' ? JSON.parse(response) : response;

				returnData.push({ json: jsonResponse });
			} catch (error) {
				throw new ApplicationError(`BVQ API Request Failed: ${error.message}`);
			}
		}

		return [returnData];
	}
}
