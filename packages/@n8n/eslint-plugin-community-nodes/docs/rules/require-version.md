# Require a valid "version" field in community node package.json (`@n8n/community-nodes/require-version`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Every community node package must declare a `version` field in its `package.json`. npm refuses to publish a package without a valid [semantic version](https://semver.org/), and n8n relies on the version to track and update installed community packages.

This rule reports a missing `version` key as well as a value that is not a valid semantic version string (for example `"1.0"`, `"v1.0.0"`, a range like `"^1.0.0"`, an empty string, or a non-string value).

## Examples

### ❌ Incorrect

```json
{
  "name": "n8n-nodes-acme"
}
```

```json
{
  "name": "n8n-nodes-acme",
  "version": "1.0"
}
```

```json
{
  "name": "n8n-nodes-acme",
  "version": "v1.0.0"
}
```

### ✅ Correct

```json
{
  "name": "n8n-nodes-acme",
  "version": "1.0.0"
}
```

```json
{
  "name": "n8n-nodes-acme",
  "version": "0.1.0-beta.1"
}
```
