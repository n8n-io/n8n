# Agent Playground Design

**Date:** 2026-02-26
**Status:** Approved
**Scope:** Dev-only Nuxt 3 app for testing @n8n/agents interactively

---

## Overview

A self-contained Nuxt 3 application living at `packages/@n8n/agents/playground/`
with its own `package.json` (not a workspace package). Monaco editor on the left
for writing agent code, multi-modal chat interface on the right for interacting
with the agent. Nuxt server routes handle TypeScript compilation and agent
execution.

## Layout

```
┌──────────────────────────────────┬──────────────────────────────┐
│  Monaco Editor (TypeScript)      │  Chat Interface              │
│                                  │                              │
│  import { Agent, Tool }          │  Messages with markdown      │
│    from '@n8n/agents';           │  rendering, file previews    │
│                                  │                              │
│  const agent = new Agent(...)    │                              │
│    .model('anthropic/...')       │                              │
│    .instructions('...')          │                              │
│    .tool(searchTool)             │                              │
│    .build();                     │                              │
│                                  │                              │
│  ● Agent active (auto-reload)    │  [message input] 📎  Send   │
└──────────────────────────────────┴──────────────────────────────┘
```

## Architecture

### Location

`packages/@n8n/agents/playground/` — own `package.json`, NOT registered as a
pnpm workspace package. Developers `cd` into it and run `pnpm dev` independently.

### Frontend

- **Nuxt 3** with default Nuxt UI/Tailwind for styling
- **Monaco editor** (`@monaco-editor/vue` or `monaco-editor` with a Vue wrapper)
  for TypeScript editing with syntax highlighting
- **Split pane** layout — Monaco left, chat right
- **Chat UI** — message bubbles with markdown rendering, file upload via
  drag-and-drop or clip button, SSE streaming for real-time token display
- **Multi-modal** — files sent as base64 alongside message text. Any file type
  the model can process (images, PDFs, etc.)

### Backend (Nuxt Server Routes)

**`/api/agent/compile` (POST)**
- Receives TypeScript source string from the editor
- Transpiles via `esbuild` (near-instant TS→JS)
- Evals in a context with `@n8n/agents` and `zod` available
- Extracts the built agent from module exports
- Stores active agent in server memory
- Returns success/error with compilation diagnostics

**`/api/agent/chat` (POST → SSE)**
- Receives message text + optional file attachments (base64)
- Calls `agent.run()` on the currently active agent
- Streams response back via SSE (token-by-token)
- Maintains conversation via fixed threadId

### Data Flow

```
Editor change (debounced 500ms)
    → POST /api/agent/compile { source: "..." }
    → esbuild transpile → eval → store agent in memory
    → { ok: true } or { error: "..." }

User sends message
    → POST /api/agent/chat { message: "...", files: [...] }
    → agent.run(prompt) → SSE stream tokens back
    → Chat UI appends tokens in real-time
```

### Key Decisions

- **esbuild for transpilation** — near-instant, no bundler overhead
- **Agent in server memory** — recompile replaces the agent. Chat history
  resets on recompile (simple, avoids stale state)
- **SSE streaming** — tokens stream to the chat as they arrive
- **Debounced auto-reload** — agent recompiles ~500ms after typing stops
- **Starter template** — editor pre-loaded with a working agent example
- **Not a workspace package** — keeps it isolated from the main build pipeline
