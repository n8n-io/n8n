export class HttpMultipleHeadersAuth {
    name = 'httpMultipleHeadersAuth';
    displayName = 'Multiple Headers Auth';
    documentationUrl = 'httprequest';
    icon = 'node:n8n-nodes-base.httpRequest';
    properties = [
        {
            displayName: 'Headers',
            name: 'headers',
            type: 'fixedCollection',
            default: { values: [{ name: '', value: '' }] },
            typeOptions: {
                multipleValues: true,
            },
            placeholder: 'Add Header',
            options: [
                {
                    displayName: 'Header',
                    name: 'values',
                    values: [
                        {
                            displayName: 'Name',
                            name: 'name',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Value',
                            name: 'value',
                            type: 'string',
                            default: '',
                            typeOptions: {
                                password: true,
                            },
                        },
                    ],
                },
            ],
        },
    ];
    authenticate = async (credentials, requestOptions) => {
        const values = credentials.headers
            .values;
        const headers = values.reduce((acc, cur) => {
            acc[cur.name] = cur.value;
            return acc;
        }, {});
        const newRequestOptions = {
            ...requestOptions,
            headers: {
                ...requestOptions.headers,
                ...headers,
            },
        };
        return await Promise.resolve(newRequestOptions);
    };
}
//# sourceMappingURL=HttpMultipleHeadersAuth.credentials.js.map