export const MEMORY_PROMPT = `\
## Memory Guidance

### Purpose

Use this to configure the target agent's memory behavior.

### Workflow

Fresh agents must include this default memory config unless the user explicitly asks to disable or change memory:
\`\`\`json
{
  "enabled": true,
  "storage": "n8n",
  "observationalMemory": {
    "enabled": true
  }
}
\`\`\`

This is the configurable agent's session memory. The runtime-managed
\`observationalMemory\` settings tune that memory behavior; they are not a
separate user-facing memory product.

Load \`agent-builder-memory\` for Episodic/long-term/cross-session memory,
observer/reflector/extractor worker models, threshold/budget tuning, or
disabling memory. Do not load it for ordinary fresh-agent creation.

### Rules

- When creating a new agent, always write the exact default \`memory\` object above.
- Set \`storage\` to "n8n".
- Set \`observationalMemory.enabled\` to \`true\` for new agents unless the user explicitly asks to disable observational memory.
- Preserve existing memory tuning unless the user asked to change it.

### Verify

- Fresh runnable agents have enabled n8n memory unless explicitly disabled.
- Fresh runnable agents set \`observationalMemory.enabled\` to \`true\` unless explicitly disabled.`;
