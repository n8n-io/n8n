# Disallow wire-format expression syntax (={{...}}) and NodeConnectionType string literals in builderHint texts and AI-builder prompts. Use expr() and SDK-canonical references instead (`@n8n/community-nodes/no-builder-hint-leakage`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

`builderHint` texts and AI-builder prompts are authored as human-facing guidance, but they sometimes leak n8n's internal wire format:

- Raw expression syntax such as `={{ $json.foo }}`, which only makes sense inside the execution engine.
- `NodeConnectionType` string literals such as `ai_languageModel` or `ai_tool`, which are structured connection identifiers rather than prose.

When these leak into hints and prompts, they confuse the builder experience and the AI assistant. Use the `expr()` SDK helper for expressions and the SDK-canonical reference helpers (e.g. `languageModel()`, `tool()`, `memory()`) instead.

## Options

This rule accepts an options object:

- `scope` (`'builderHint' | 'all'`, default `'builderHint'`) — `builderHint` only scans string values inside `builderHint` property values. `all` scans every string in the file, intended for AI-builder prompt files.

## Examples

### ❌ Incorrect

```typescript
const node = {
  builderHint: 'Set the model with ={{ $json.model }} and connect an ai_languageModel.',
};
```

### ✅ Correct

```typescript
const node = {
  builderHint: 'Set the model with expr($json.model) and connect a languageModel().',
};
```
