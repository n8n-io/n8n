import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { execute } from './Services';
import { propertiesConfig } from './propertiesConfig';

export class EfiBankPix implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Efí Bank | API Pix',
    name: 'EfiBankPix',
    icon: 'file:efi.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["endpoints"] + ": " + $parameter["transactionType"]}}',
    description: 'Integração com a API Pix da Efí Bank',
    defaults: {
      name: 'Efí Bank Pix',
    },
    inputs: ['main' as NodeConnectionType],
    outputs: ['main' as NodeConnectionType],
    credentials: [
      {
        name: 'EfiBankPixApi',
        required: true,
      },
    ],
    properties: propertiesConfig,
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const endpoint = this.getNodeParameter('endpoints', i) as string;
      const result = await execute.call(this, endpoint, i);
      returnData.push(...result);
    }

    return [returnData];
  }
}
