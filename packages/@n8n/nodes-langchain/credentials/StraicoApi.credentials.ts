import {
    IAuthenticateGeneric,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class StraicoApi implements ICredentialType {
    name = 'StraicoApi';
    displayName = 'Straico API';
    documentationUrl = 'https://documenter.getpostman.com/view/5900072/2s9YyzddrR';
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '={{ "Bearer " + $credentials.apiKey }}',
            },
        },
    } as IAuthenticateGeneric;
}