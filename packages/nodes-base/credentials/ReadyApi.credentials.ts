import {
  ICredentialType,
  NodePropertyTypes,
} from 'n8n-workflow';

export class ReadyApi implements ICredentialType {
  name = 'readyApi';
  displayName = 'Ready API';
  documentationUrl = 'Ready';
  properties = [
    {
        displayName: 'Token',
        name: 'token',
        type: 'string' as NodePropertyTypes,
        default: '',
    },
  ];
}