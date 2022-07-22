import {
    ICredentialType,
    NodePropertyTypes,
} from 'n8n-workflow';

export class DigitalisoApi implements ICredentialType {
    name = 'digitalisoApi';
    displayName = 'Digitaliso API';
    documentationUrl = 'digitaliso';
    properties = [
        {
            displayName: 'Company',
            name: 'company',
            type: 'string' as NodePropertyTypes,
            default: '',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string' as NodePropertyTypes,
            default: '',
        },
    ];
}
