import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class MemoryBoxApi implements ICredentialType {
  name = 'memoryBoxApi';
  displayName = 'Memory Box API';
  documentationUrl = 'https://memorybox.amotivv.ai/docs';
  properties: INodeProperties[] = [
    {
      displayName: 'API Token',
      name: 'token',
      type: 'string',
      default: '',
      typeOptions: {
        password: true,
      },
      required: true,
      description: 'The Memory Box API token that serves as user identification',
    },
    {
      displayName: 'API URL',
      name: 'apiUrl',
      type: 'string',
      default: 'https://memorybox.amotivv.ai/api',
      required: true,
      description: 'The Memory Box API URL (do not include trailing slash)',
    },
  ];
}
