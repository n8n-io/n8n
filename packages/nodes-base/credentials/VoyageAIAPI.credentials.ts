import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class VoyageAIAPI implements ICredentialType {
  name = 'VoyageAIAPI';
  displayName = 'Voyage AI API';
  documentationUrl = 'https://docs.voyageai.com/'; 
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
    },
  ];
}
