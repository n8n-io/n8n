export class AirtableTokenApi {
    name = 'airtableTokenApi';
    displayName = 'Airtable Personal Access Token API';
    documentationUrl = 'airtable';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: `Make sure you enabled the following scopes for your token:<br>
				<code>data.records:read</code><br>
				<code>data.records:write</code><br>
				<code>schema.bases:read</code><br>
				`,
            name: 'notice',
            type: 'notice',
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.airtable.com/v0/meta/whoami',
        },
    };
}
//# sourceMappingURL=AirtableTokenApi.credentials.js.map