# Enforce valid credential documentationUrl format (URL or lowercase alphanumeric slug) (`@n8n/community-nodes/credential-documentation-url`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Options

<!-- begin auto-generated rule options list -->

| Name         | Description                                            | Type    |
| :----------- | :----------------------------------------------------- | :------ |
| `allowSlugs` | Whether to allow lowercase alphanumeric slugs with slashes | Boolean |
| `allowUrls`  | Whether to allow valid URLs                            | Boolean |

<!-- end auto-generated rule options list -->

## Rule Details

Ensures that credential `documentationUrl` values are in a valid format. For community packages, this should always be a complete URL to your documentation.

The lowercase alphanumeric slug option (`allowSlugs`) is only intended for internal n8n use when referring to slugs on docs.n8n.io, and should not be used in community packages. When enabled, uppercase letters in slugs will be automatically converted to lowercase.

## Examples

### ❌ Incorrect

```typescript
export class MyApiCredential implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  documentationUrl = 'invalid-url-format'; // Not a valid URL
  // ...
}
```

```typescript
export class MyApiCredential implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  documentationUrl = 'MyApi'; // Invalid: uppercase letters (will be autofixed to 'myapi')
  // ...
}
```

```typescript
export class MyApiCredential implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  documentationUrl = 'my-api'; // Invalid: special characters not allowed
  // ...
}
```

### ✅ Correct

```typescript
export class MyApiCredential implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  documentationUrl = 'https://docs.myservice.com/api-setup'; // Complete URL to documentation
  // ...
}
```

```typescript
export class MyApiCredential implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  documentationUrl = 'https://github.com/myuser/n8n-nodes-myapi#credentials'; // GitHub README section
  // ...
}
```

## Configuration

By default, only URLs are allowed, which is the recommended setting for community packages.

The `allowSlugs` option is available for internal n8n development:

```json
{
  "rules": {
    "@n8n/community-nodes/credential-documentation-url": [
      "error",
      {
        "allowSlugs": true
      }
    ]
  }
}
```

**Note:** Community package developers should keep the default settings and always use complete URLs for their documentation.
