# Bugbot Review Rules

## LLM Model Cost Controls

When a pull request changes product code, demo code, config, env defaults, or test env fixtures that set an LLM model ID:

- Flag any Opus-class Anthropic model ID matching `/claude[^'"\n]*opus/i` unless the same changed hunk includes an adjacent `opus-approved: <URL>` comment and the PR description links the approval.
- Add a blocking Bug titled "Use Sonnet-class model by default".
- In the Bug body, say: "Opus-class models should not be defaults in n8n product or demo paths. Use `claude-sonnet-4-6` unless an Opus run was explicitly approved."
- Suggest replacing the Opus model ID with `claude-sonnet-4-6`.

Do not flag model-picker tests, telemetry samples, documentation, or this `BUGBOT.md` file when they only mention Opus as a non-default example.

Validation example: a changed product default such as `analystModel: string = 'claude-opus-4-1'` should be flagged and fixed to `claude-sonnet-4-6`.
