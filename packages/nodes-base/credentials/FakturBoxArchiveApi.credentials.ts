import {
    ICredentialType,
    NodePropertyTypes,
} from 'n8n-workflow';

export class FakturBoxArchiveApi implements ICredentialType {
    name = 'FakturBoxArchiveApi';
    displayName = 'faktur:box Archive';
    documentationUrl = 'fakturbox';
    properties = [
        {
            displayName: 'Service-URL',
            name: 'url',
            type: 'string' as NodePropertyTypes,
            default: '',
        },
        {
            displayName: 'SessionGuid',
            name: 'sessionguid',
            type: 'string' as NodePropertyTypes,
            typeOptions: {
                password: true
            },
            default: '',
        },
    ];
}
