import {
    ICredentialType,
    NodePropertyTypes,
} from 'n8n-workflow';

export class BambooHRApi implements ICredentialType {
    name = 'bambooHRApi';
    displayName = 'BambooHR API';
    documentationUrl = 'bambooHR';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string' as NodePropertyTypes,
            default: '',
        },
    ];
}