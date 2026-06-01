# Enforce correct package naming convention for n8n community nodes (`@n8n/community-nodes/package-name-convention`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Validates that your package name follows the correct n8n community node naming convention. Package names must start with `n8n-nodes-` and can optionally be scoped.

The rule also requires a `name` field to be present and rejects the default placeholder (`n8n-nodes-<...>`) that ships with the node starter template, so packages are not published with a missing or unfilled name.

## Examples

### ❌ Incorrect

```json
{
  "name": "my-service-integration"
}
```

```json
{
  "name": "nodes-my-service"
}
```

```json
{
  "name": "@company/my-service"
}
```

```json
{
  "name": "n8n-nodes-<...>"
}
```

```json
{
  "version": "1.0.0"
}
```

### ✅ Correct

```json
{
  "name": "n8n-nodes-my-service"
}
```

```json
{
  "name": "@company/n8n-nodes-my-service"
}
```

## Best Practices

- Use descriptive service names: `n8n-nodes-github` rather than `n8n-nodes-api`
- For company packages, use your organization scope: `@mycompany/n8n-nodes-internal-tool`
