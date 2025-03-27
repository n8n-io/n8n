import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { execute } from './Services';
import { propertiesConfig } from './PropertiesConfig';

export class EfiBankCobrancas implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Efí Bank | API Cobranças',
    name: 'EfiBankCobrancas',
    icon: 'file:efi.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["endpoints"] + ": " + $parameter["transactionType"]}}',
    description: 'Integração com a API Cobranças do Efí Bank',
    defaults: {
      name: 'Efí Bank Cobranças',
    },
    inputs: ['main' as NodeConnectionType],
    outputs: ['main' as NodeConnectionType],
    credentials: [
      {
        name: 'EfiBankCobApi',
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
