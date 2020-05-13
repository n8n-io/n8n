import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
    INodeTypeDescription,
    IDataObject
} from 'n8n-workflow';
import { adAccountInsightOperations, adAccountInsightFields } from './AdAccountInsightDescription';


export class FacebookAds implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Facebook Ads',
        name: 'facebookAds',
		icon: 'file:facebookads.png',
		group: ['transform'],
		version: 1,
		description: 'Consume Facebook Ads API.',
		defaults: {
			name: 'DisplayNameReplace',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
                type: 'options',
                options: [
                    {
                        name: 'Ad Account Insight',
                        value: 'adAccountInsight'
                    }
                ],
				default: 'adAccountInsight',
				description: 'The description text',
            },
            
            // Ad Account
            ...adAccountInsightOperations,
            ...adAccountInsightFields
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
        const returnData : IDataObject[] = [];
        let responseData;
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            if (resource === 'adAccountInsight') {
                if (operation === 'get' || operation === 'create') {
                    
                }
            }

		}

		return this.prepareOutputData(items);

	}
}