# Warn about third-party licence headers and bundled dependencies (`@n8n/community-nodes/no-vendored-dependencies`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Community nodes must not ship runtime dependencies. This rule warns when a leading block comment in a `.ts` or `.js` source file contains a third-party licence header. It also warns about non-empty `bundledDependencies` or `bundleDependencies` in `package.json`.

The rule detects copyright notices, `@license`, `Licensed under the MIT`, Apache, BSD, or ISC, and `This file is part of` headers. It compares copyright holders with the package author. The author can use the npm string or object format.

A warning asks a reviewer to check whether the author copied a library. It does not prove that the code contains a runtime dependency. The rule does not flag original implementations or files in `dist/`.

## Examples

### Incorrect

```typescript
/*! js-yaml 4.1.0 | (c) 2011-2015 Kirill Simonov | MIT */
export const version = '4.1.0';
```

```json
{
  "bundledDependencies": ["js-yaml"]
}
```

### Correct

```typescript
// Encode only text fields because community nodes cannot use runtime dependencies.
export function encodeField(name: string, value: string): string {
	return `Content-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
}
```

For a package whose author is `Jane Doe`:

```typescript
/* Copyright (c) Jane Doe */
export const boundary = 'n8n-example-boundary';
```

```json
{
  "bundledDependencies": []
}
```
