import {
    ICredentialType,
    NodePropertyTypes,
} from 'n8n-workflow';


export class OAuth2Api implements ICredentialType {
    name = 'OAuth2Api';
    displayName = 'OAuth2 API';
    properties = [
        {
            displayName: 'Authorization URL',
            name: 'authUrl',
            type: 'string' as NodePropertyTypes,
            default: '',
            required: true,
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'string' as NodePropertyTypes,
            default: '',
            required: true,
        },
        {
            displayName: 'Callback URL',
            name: 'callbackUrl',
            type: 'string' as NodePropertyTypes,
            default: '',
            required: true,
        },
        {
            displayName: 'Client ID',
            name: 'clientId',
            type: 'string' as NodePropertyTypes,
            default: '',
            required: true,
        },
        {
            displayName: 'Client Secret',
            name: 'clientSecret',
            type: 'string' as NodePropertyTypes,
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'string' as NodePropertyTypes,
            default: '',
        },
    ];
}
