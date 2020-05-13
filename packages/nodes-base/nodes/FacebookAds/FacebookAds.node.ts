import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
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

		let item: INodeExecutionData;
		let myString: string;

		// Itterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			myString = this.getNodeParameter('myString', itemIndex, '') as string;
			item = items[itemIndex];

			item.json['myString'] = myString;
		}

		return this.prepareOutputData(items);

	}
}