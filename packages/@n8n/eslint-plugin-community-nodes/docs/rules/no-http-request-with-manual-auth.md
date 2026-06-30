# Disallow this.helpers.httpRequest() in functions that call this.getCredentials(). Use this.helpers.httpRequestWithAuthentication() instead (`@n8n/community-nodes/no-http-request-with-manual-auth`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

When a function calls `this.getCredentials()` to retrieve credentials, it should use `this.helpers.httpRequestWithAuthentication()` for HTTP requests instead of `this.helpers.httpRequest()`.

Manually extracting credentials and setting auth headers (e.g. `Authorization`) bypasses n8n's authentication layer, which provides:

- Consistent credential handling across all nodes
- Future improvements like token refresh and audit logging
- Better security review surface

## Examples

### ❌ Incorrect

```typescript
async function apiRequest(this: IExecuteFunctions, endpoint: string) {
  const credentials = await this.getCredentials('myServiceApi');

  const options: IHttpRequestOptions = {
    method: 'GET',
    url: `https://api.example.com/${endpoint}`,
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
    },
  };

  return this.helpers.httpRequest(options);
}
```

### ✅ Correct

```typescript
async function apiRequest(this: IExecuteFunctions, endpoint: string) {
  const options: IHttpRequestOptions = {
    method: 'GET',
    url: `https://api.example.com/${endpoint}`,
  };

  return this.helpers.httpRequestWithAuthentication.call(this, 'myServiceApi', options);
}
```

## When to Disable

If a function genuinely retrieves credentials for a non-HTTP purpose (e.g. reading a config value) *and* also makes an unauthenticated HTTP request, you can suppress this rule with an inline comment:

```typescript
// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
return this.helpers.httpRequest(options);
```
