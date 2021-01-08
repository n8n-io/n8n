import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
  INodeTypeDescription
} from 'n8n-workflow';
import { sendDatpoint } from './Beeminder.node.functions';


export class Beeminder implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Beeminder',
		name: 'beeminder',
		group: ['output'],
		version: 1,
		description: 'Custom Beeminder Api',
		defaults: {
			name: 'Beeminder',
			color: '#FFCB06',
    },
    icon: 'file:beeminder.png',
		inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'beeminderApi',
        required: true
      }
    ],
		properties: [
      {
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Send datapoint',
						value: 'sendDatapoint',
						description: 'Send datapoint to Beeminder goal',
					}
				],
				default: 'sendDatapoint',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Goal name',
				name: 'goalName',
				type: 'string',
				default: '',
				placeholder: 'Goal name',
        description: 'Goal name',
        required: true
      },
			{
				displayName: 'Datapoint value',
				name: 'value',
        type: 'number',
				default: 1,
				placeholder: '',
        description: 'Datapoint value to send',
        displayOptions: {
					show: {
						operation: ['sendDatapoint'],
					},
        },
        required: true
      },
      {
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				placeholder: 'Comment',
        description: 'Comment',
        displayOptions: {
					show: {
						operation: ['sendDatapoint']
          }
        }
      }
    ]
  };
  
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
		const returnData: INodeExecutionData[][] = [];
    const length = items.length as unknown as number;

    const operation = this.getNodeParameter('operation', 0) as string;

    if (operation === 'sendDatapoint') {
      for (let i = 0; i < length; i++) {
        const goalName = this.getNodeParameter('goalName', i) as string;
        const comment = this.getNodeParameter('comment', i) as string;
        const value = this.getNodeParameter('value', i) as number;

        const results = await sendDatpoint.call(this, goalName, value, comment);

        returnData.push(this.helpers.returnJsonArray(results));
      }
    }

    return returnData;
  }
}

	