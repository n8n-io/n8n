# Ensure every file registered in "n8n.nodes" and "n8n.credentials" exports a class named after the file (`@n8n/community-nodes/class-name-matches-filename`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

n8n doesn't scan a node or credential file for its class. It takes the file name up to the first dot and looks up the export with exactly that name, so `dist/nodes/Foo/Foo.node.js` has to export `Foo`. The lookup is case-sensitive. If the names differ, `new (require(file)[name])()` throws and n8n can't load the package at all, even though it builds and runs fine on its own.

This rule reads every path in the `n8n.nodes` and `n8n.credentials` arrays of `package.json` and checks that the file exports a class named after it. It checks the registered (compiled) file in a published package and the TypeScript source in a source checkout.

## Examples

### ❌ Incorrect

```json
{
  "n8n": {
    "nodes": ["dist/nodes/CRM/Crm.node.js"],
    "credentials": ["dist/credentials/acmeboard.credentials.js"]
  }
}
```

```ts
// nodes/CRM/Crm.node.ts: n8n looks for `Crm`
export class CRM implements INodeType {}

// credentials/acmeboard.credentials.ts: n8n looks for `acmeboard`
export class AcmeBoard implements ICredentialType {}
```

### ✅ Correct

```json
{
  "n8n": {
    "nodes": ["dist/nodes/CRM/CRM.node.js"],
    "credentials": ["dist/credentials/AcmeBoardApi.credentials.js"]
  }
}
```

```ts
// nodes/CRM/CRM.node.ts
export class CRM implements INodeType {}

// credentials/AcmeBoardApi.credentials.ts
export class AcmeBoardApi implements ICredentialType {}
```
