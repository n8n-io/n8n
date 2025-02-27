import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class FnShiftApi implements ICredentialType {
  name = 'fnShiftApi';
  displayName = 'FnShift API';
  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: '',
      required: true,
      placeholder: 'https://your-fnshift-instance.com',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      default: '',
      required: true,
      typeOptions: {
        password: true,
      },
    },
  ];
}
