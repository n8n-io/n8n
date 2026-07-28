# Require a "homepage" field with a valid URL in package.json (`@n8n/community-nodes/require-homepage`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

A published community node package should point users to a homepage — a
project website, repository, or documentation page — so they can learn more
about the node and its maintainer. This rule requires the `package.json` to
declare a `homepage` field that is a valid URL.

The value is parsed with the `URL` constructor, so it must include a protocol
(e.g. `https://`). Bare domains (`example.com`) and placeholder values (`TODO`)
are rejected.

## Examples

### ❌ Incorrect

```json
{
  "name": "n8n-nodes-my-service"
}
```

```json
{
  "name": "n8n-nodes-my-service",
  "homepage": ""
}
```

```json
{
  "name": "n8n-nodes-my-service",
  "homepage": "example.com"
}
```

### ✅ Correct

```json
{
  "name": "n8n-nodes-my-service",
  "homepage": "https://github.com/acme/n8n-nodes-my-service"
}
```
