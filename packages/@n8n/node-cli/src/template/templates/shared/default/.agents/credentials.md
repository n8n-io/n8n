# Credentials

Credentials are used to authenticate with external services and store
sensitive values. They are encrypted at rest.

## Credential class anatomy
Credentials classes have:
- `name` – machine name (used in nodes' `credentials` array)
- `displayName` – human-readable label in the UI
- `properties` – parameters (similar types to node properties)
Sensitive properties should set `typeOptions.password = true`

## Example
Simplified WordPress example:
```typescript
export class WordpressApi implements ICredentialType {
  name = 'wordpressApi';
  displayName = 'Wordpress API';
  documentationUrl = 'wordpress';

  properties: INodeProperties[] = [
    {
      displayName: 'Username',
      name: 'username',
      type: 'string',
      default: '',
    },
    {
      displayName: 'Password',
      name: 'password',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
    },
    {
      displayName: 'Wordpress URL',
      name: 'url',
      type: 'string',
      default: '',
      placeholder: 'https://example.com',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      auth: {
        username: '={{$credentials.username}}',
        password: '={{$credentials.password}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials?.url}}/wp-json/wp/v2',
      url: '/users',
      method: 'GET',
    },
  };
}
```

## Notes
- `test` describes how to check if credentials are valid to show a
  message to the user in the UI
  - Not strictly required, but strongly recommended.
- `authenticate` describes how to modify requests for declarative-style
  nodes and the HTTP Request node.

## Custom authenticate function
You can also use a custom authenticate function:
```typescript
authenticate: IAuthenticate = async (credentials, requestOptions) => {
  const values = (credentials.headers as { values: Array<{ name: string; value: string }> }).values;

  const headers = values.reduce((acc, cur) => {
    acc[cur.name] = cur.value;
    return acc;
  }, {} as Record<string, string>);

  return {
    ...requestOptions,
    headers: {
      ...requestOptions.headers,
      ...headers,
    },
  };
};
```

## OAuth2 credentials
For services using OAuth2:
- You usually do not need to define `test` or `authenticate` explicitly.
- Instead, create credentials that extend `oAuth2Api`:
```typescript
export class MyServiceOAuth2Api implements ICredentialType {
  name = 'myServiceOAuth2Api';
  displayName = 'My Service OAuth2 API';
  extends = ['oAuth2Api'];

  properties: INodeProperties[] = [
    // Add only the extra properties your service needs,
    // e.g. scopes, custom URLs, etc.
  ];
}
```
- The base `oAuth2Api` handles the generic OAuth2 flow.
- When allowing users to specify scopes in a custom OAuth2 credential,
  make sure to follow n8n's internal rules (see n8n docs).
- If you want to define scopes that the credentials will request, add a
  property with `name: 'scope'`, `type: 'hidden'` and `default` field
  that has your desired scopes
