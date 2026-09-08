export class SupabaseApi {
    name = 'supabaseApi';
    displayName = 'Supabase API';
    documentationUrl = 'supabase';
    properties = [
        {
            displayName: 'Host',
            name: 'host',
            type: 'string',
            placeholder: 'https://your_account.supabase.co',
            default: '',
            description: 'Your Supabase project URL without the <code>/rest/v1</code> path. If you copied the full Data API URL, remove the <code>/rest/v1</code> suffix.',
        },
        {
            displayName: 'Secret Key',
            name: 'serviceRole',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
            description: 'Your Supabase project secret key. You can create one in the <a href="https://supabase.com/dashboard/project/_/settings/api-keys" target="_blank">API Keys settings</a> of your project. Legacy service_role secrets are also supported.',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                apikey: '={{$credentials.serviceRole}}',
                Authorization: '=Bearer {{$credentials.serviceRole}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.host}}/rest/v1',
            headers: {
                Prefer: 'return=representation',
            },
            url: '/',
        },
    };
}
//# sourceMappingURL=SupabaseApi.credentials.js.map