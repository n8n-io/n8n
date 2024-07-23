import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class VoyageAIApi implements ICredentialType {
  name = 'voyageAIApi';
  displayName = 'Voyage AI API';
  documentationUrl = 'https://docs.voyageai.com/'; // Replace with actual documentation URL
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
