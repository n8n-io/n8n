import {
    IExecuteFunctions
} from 'n8n-core';

import {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

import {
    OptionsWithUri,
} from 'request';

export class CollecthorMailInvite implements INodeType {
    description: INodeTypeDescription = {
        displayName: "CollecthorMailInvite",
			  name: "collecthorMailInvite",
				group: ['transform'],
        icon: 'file:logo.png',
        version: 1,
        description: "Trigger mail invitation in Collecthor",
        defaults: {
            name: "CollecthorMailInvite",
            color: '#1A82e2'
        },
        inputs: ['main'],
        outputs: [],
        credentials: [
					{
						name: 'collecthorApi',
						required: true,
					},
        ],
        properties: [
					{
						displayName: "Channel",
						type: 'number',
						name: 'channel',
						required: true,
						description: 'Channel',
						default: null,
					},
            {
                displayName: 'Email address',
                name: 'email',
                type: 'string',
                default: '',
							  required: true,
                description: 'Recipient email',
            },
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							required: true,
							description: 'Recipient name',
						},
					{
						displayName: 'Days between mail',
						name: 'daysBetweenMail',
						required: false,
						default: 0,
						description: 'Minimum days between adding duplicate emails',
						type: 'number',
					},
					{
						displayName: 'Additional Fields',
						name: 'additionalFields',
						type: 'fixedCollection',
						placeholder: 'Add Field',
						default: {},
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								name: 'parameter',
								displayName: 'Parameter',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the parameter.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the parameter.',
									},
								],
							},
						],
					},
        ]
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			let responseData;
			const returnData = [];

			const credentials = this.getCredentials('collecthorApi') as IDataObject;
			const items = this.getInputData();

    	for (let i = 0; i < items.length; i++) {
    		const email = this.getNodeParameter('email', i) as string;
				const name = this.getNodeParameter('name', i) as string;
				const channel = this.getNodeParameter('channel', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

				const dataDict: IDataObject = {};
				if (additionalFields.parameter !== undefined) {
					const parameters = additionalFields.parameter as {name: string; value: string }[];
					for (let j = 0; j < parameters.length; j++) {
						dataDict[parameters[j].name] = parameters[j].value;
					}
				}
				const data: IDataObject = {
					email,
					name,
					data: dataDict
				};

				const requestOptions: OptionsWithUri = {
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${credentials.apiKey}`,
					},
					method: 'POST',
					body: data,
					json: true,
					uri: `https://app.collecthor.nl/v2/rpc/createAndInviteTarget?id=${channel}`


				}
				responseData = await this.helpers.request(requestOptions);
				returnData.push(responseData);
			}



			  return [this.helpers.returnJsonArray(returnData)];

    }
}
