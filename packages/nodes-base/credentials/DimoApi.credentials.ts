import {
	Icon,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow'

export class DimoApi implements ICredentialType {
  name = 'dimoApi';
  displayName = 'DIMO API';
  documentationUrl = 'https://docs.dimo.org/developer-platform';
	icon: Icon = { light: 'file:/Dimo.svg', dark:'file:Dimo.svg' };

  properties: INodeProperties[] = [
    {
      displayName: 'Client ID',
      name: 'clientId',
      type: 'string',
      default: '',
      description: 'Your Ethereum address that serves as the client ID from your DIMO app',
      required: true,
    },
    {
      displayName: 'Redirect URI',
      name: 'redirectUri',
      type: 'string',
      default: '',
      description: 'The redirectUri associated with your DIMO app',
      required: true,
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Your API key, generated in the DIMO Dev Console, for signing authentication challenges',
      required: true,
    },
    {
      displayName: 'Environment',
      name: 'environment',
      type: 'options',
      options: [
        {
          name: 'Production',
          value: 'Production',
        },
        {
          name: 'Development',
          value: 'Dev',
        },
      ],
      default: 'Production',
    }
  ];
}

export default DimoApi;
