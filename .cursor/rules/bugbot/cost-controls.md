# Bugbot: LLM Cost Controls

## Rule: Do Not Default to Opus-Class Models

**Rule**: Product and demo code must not default to Opus-class Anthropic models. Use Sonnet-class models unless an explicit approval is documented.

### Problem

Opus defaults in demo or product paths inflate cost for every local run, customer demo, and CI smoke test that touches the analyst chat path.

### Solution

Use `claude-sonnet-4-6` or `claude-sonnet-4-5-20250929` by default. Allow Opus only behind an explicit opt-in and document the approval.

```ts
// BAD: Opus set as a default in product code
@Env('N8N_INSIGHTS_ANALYST_MODEL')
analystModel: string = 'claude-opus-4-7-20260101';

// GOOD: Sonnet default
@Env('N8N_INSIGHTS_ANALYST_MODEL')
analystModel: string = 'claude-sonnet-4-5-20250929';
```

### When to Flag

- Any changed hunk containing a string that matches `/claude[^'"\n]*opus/i` and represents a default model selection in product, demo, config, or env paths
- The match has no adjacent `opus-approved: <URL>` comment in the same hunk and no link to the approval in the PR description

Add a blocking Bug titled **"Use Sonnet-class model by default"** with the body:

> Opus-class models should not be defaults in n8n product or demo paths. Use `claude-sonnet-4-5-20250929` unless an Opus run was explicitly approved.

Suggest replacing the Opus model ID with `claude-sonnet-4-5-20250929`.

### Exceptions

- Model-picker tests that enumerate available models
- Telemetry samples and mock fixtures that reference Opus as a non-default example
- Documentation files (`*.md`)
- Hunks with an adjacent `opus-approved: <URL>` comment and a linked approval in the PR description
