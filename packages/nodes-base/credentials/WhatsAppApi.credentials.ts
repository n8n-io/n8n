import {
    ICredentialType,
    INodeProperties,
    NodePropertyTypes,
} from 'n8n-workflow';

export class WhatsAppApi implements ICredentialType {
    name = 'whatsAppApi';
    displayName = 'WhatsApp API';
    documentationUrl = 'whatsApp';
    properties: INodeProperties[] = [
        {
            displayName: 'Access token',
            type: 'string',
            name: 'accessToken',
            default: '',
        },
    ];
}