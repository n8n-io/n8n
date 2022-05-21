import {
    ICredentialType,
    NodePropertyTypes,
} from 'n8n-workflow';

export class WhatsAppApi implements ICredentialType {
    name = 'whatsAppApi';
    displayName = 'WhatsApp API';
    documentationUrl = 'whatsApp';
    properties = [
        {
            displayName: 'Access token',
            name: 'accessToken',
            type: 'string' as NodePropertyTypes,
            default: '',
        },
    ];
}