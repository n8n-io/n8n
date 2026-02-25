# Frontend Module

The Vue 3 conversational interface for Instance AI.

## Module Registration

Instance AI registers as a frontend module via `module.descriptor.ts`:

```typescript
{
  id: 'instance-ai',
  name: 'Instance AI',
  description: 'Chat with the n8n Instance AI agent.',
  icon: 'sparkles',
  routes: [
    { name: 'InstanceAi',       path: '/instance-ai',            component: InstanceAiView },
    { name: 'InstanceAiThread', path: '/instance-ai/:threadId',  component: InstanceAiView },
  ],
}
```

Both routes use the `default` layout and require `authenticated` middleware.

### Sidebar Integration

The Instance AI menu item appears in `ProjectNavigation.vue` at the bottom of
the sidebar, gated by the module's enabled status:

```typescript
const isInstanceAiAvailable = computed(
  () => settingsStore.isModuleActive('instance-ai')
);
```

When active, it renders as a sparkles icon with the label from
`projects.menu.instanceAi`. The item links to the `InstanceAi` route.

## Component Breakdown

```
InstanceAiView.vue                 <- Main layout (two-column)
├── InstanceAiThreadList.vue       <- Thread sidebar (left column)
└── Chat area (right column)
    ├── Header (title)
    ├── Scrollable message list
    │   └── InstanceAiMessage.vue  <- Per-message bubble
    │       ├── Reasoning block (collapsible)
    │       ├── InstanceAiToolCall.vue  <- Tool call card (collapsible)
    │       └── InstanceAiMarkdown.vue  <- Rendered markdown content
    └── InstanceAiInput.vue        <- Text input + send/stop button
```

### InstanceAiView.vue

The main two-column layout:

- **Left column** (260px): Thread list sidebar with border separator
- **Right column**: Header + scrollable message area + input bar
- **Empty state**: Shows subtitle text when no messages exist
- **Auto-scroll**: Watches `store.messages.length` and content changes, scrolls
  to bottom via `nextTick`
- **Thread management**: Creates default thread on mount, supports new thread
  creation and switching

### InstanceAiInput.vue

Text input with streaming-aware controls.

| Feature | Detail |
|---------|--------|
| Auto-grow textarea | Min 24px, max 200px height |
| Submit shortcut | Cmd+Enter (Mac) / Ctrl+Enter (Windows/Linux) |
| Send button | Arrow-up icon, disabled when empty or streaming |
| Stop button | Square icon, appears during streaming |
| Emits | `submit(message)`, `stop()` |

### InstanceAiThreadList.vue

Thread sidebar with creation and selection.

- Header with "+ New" button (secondary variant, small size)
- Scrollable list with hover effect
- Active thread highlighted with `--color--primary--tint-3`
- Each item shows a message-square icon and truncated title
- Empty state message when no threads exist

### InstanceAiMessage.vue

Renders a single message bubble (user or assistant).

**User messages**: Right-aligned bubble with primary background color.

**Assistant messages** (top to bottom):
1. **Reasoning block** — Collapsible section with brain icon, only shown when
   `message.reasoning` is non-empty. Uses reka-ui `Collapsible*` components.
2. **Tool calls** — Each rendered as an `InstanceAiToolCall` component.
3. **Text content** — Rendered via `InstanceAiMarkdown`.
4. **Typing animation** — Three blinking dots shown when streaming with no
   content yet (1.4s animation, staggered delays).

### InstanceAiToolCall.vue

Collapsible card showing tool invocation details.

| Element | Detail |
|---------|--------|
| Status icon | Spinner (loading), triangle-alert (error), check (success) |
| Tool name | Monospace font |
| Chevron | Toggle expand/collapse |
| Input section | Formatted JSON of `toolCall.args` |
| Output section | Formatted JSON of `toolCall.result` (or error) |
| Running section | Status text while tool executes |

Colors: spinner uses `--color--primary`, error icon uses `--color--danger`,
success icon uses `--color--success`.

### InstanceAiMarkdown.vue

Thin wrapper around `ChatMarkdownChunk` from the Chat Hub feature. Converts
the content string to `{ type: 'text', content }` and delegates rendering.

## Pinia Store

### State Shape

```typescript
{
  currentThreadId: string;                    // Active thread UUID
  messages: InstanceAiChatMessage[];          // Chat history
  isStreaming: boolean;                       // Request in progress
  abortController: AbortController | null;    // For cancellation
  threads: Array<{
    id: string;
    title: string;
    createdAt: string;
  }>;
}
```

### Message Types

```typescript
interface InstanceAiChatMessage {
  id: string;                                 // UUID
  role: 'user' | 'assistant';
  content: string;                            // Accumulated text
  toolCalls: InstanceAiToolCallState[];
  reasoning: string;                          // Accumulated reasoning
  isStreaming: boolean;                       // Still receiving chunks
  createdAt: string;                          // ISO timestamp
}

interface InstanceAiToolCallState {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  isError?: boolean;
  isLoading: boolean;
}
```

### Chunk Dispatch (`handleChunk`)

The Pinia store's `handleChunk()` method routes each chunk type to the
appropriate state mutation:

| Chunk Type | State Update |
|-----------|--------------|
| `text-delta` | Append `payload.text` to `message.content` |
| `reasoning-delta` | Append `payload.text` to `message.reasoning` |
| `tool-call` | Push new `InstanceAiToolCallState` to `message.toolCalls` |
| `tool-result` | Find tool call by ID, set `result`, clear `isLoading` |
| `tool-error` | Find tool call by ID, set `result`, mark `isError=true` |
| `error` | Append error text to `message.content` |
| `done` / `finish` | Set `message.isStreaming = false` |

### Key Methods

**`sendMessage(message: string)`**

1. Creates user message, appends to `messages`
2. Updates thread title from first 60 chars (if still "New conversation")
3. Creates assistant stub with `isStreaming: true`
4. Creates `AbortController`
5. Calls `sendInstanceAiMessage()` with `onChunk`, `onDone`, `onError` callbacks

**`handleChunk(messageId, chunk)`**

Dispatches by `chunk.type` — see table above.

**`stopStreaming()`**

Aborts the request, clears the controller, marks the last assistant message
as done.

**`newThread()`**

Creates a new thread with UUID, resets messages, prepends to thread list.

**`switchThread(threadId)`**

Changes `currentThreadId`, clears in-memory messages. Backend memory
persistence means switching back to a thread will reload its history from
storage.

## API Layer

```typescript
async function sendInstanceAiMessage(
  context: IRestApiContext,
  threadId: string,
  message: string,
  onChunk: (chunk: InstanceAiStreamChunk) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  abortSignal?: AbortSignal,
): Promise<void>
```

Uses `streamRequest()` from `@n8n/rest-api-client` with `'\n'` as the chunk
delimiter. The context provides auth headers and the base URL.

The API client call:

```typescript
await streamRequest<InstanceAiStreamChunk>(context, {
  url: `/instance-ai/chat/${threadId}`,
  method: 'POST',
  body: { message },
  delimiter: '\n',
  onChunk,
  onDone,
  onError,
  abortSignal,
});
```

Each newline-delimited JSON line is parsed and dispatched to the `onChunk`
callback.

## i18n Keys

| Key | Usage |
|-----|-------|
| `instanceAi.view.title` | View header |
| `instanceAi.view.subtitle` | Empty state text |
| `instanceAi.input.placeholder` | Textarea placeholder |
| `instanceAi.input.send` | Send button tooltip |
| `instanceAi.input.stop` | Stop button tooltip |
| `instanceAi.thread.new` | New thread button label |
| `instanceAi.sidebar.noThreads` | Empty thread list text |
| `instanceAi.message.reasoning` | Reasoning section header |
| `instanceAi.toolCall.input` | Tool input label |
| `instanceAi.toolCall.output` | Tool output label |
| `instanceAi.toolCall.error` | Tool error label |
| `instanceAi.toolCall.running` | Tool loading text |
| `projects.menu.instanceAi` | Sidebar nav label |

## Thread Model

Threads are managed client-side in the Pinia store. The backend does not have
a thread CRUD API — thread identity is simply a UUID passed to the memory
system as the `thread` parameter. When the user creates a new thread, the
frontend generates a UUID and starts sending messages under that ID.

Conversation history persists server-side in the memory storage backend
(PostgreSQL or LibSQL), keyed by `{ resource: userId, thread: threadId }`.

## Related Docs

- [Chat & Streaming](../features/chat/) — streaming protocol and chunk types
- [Backend Module](./backend-module.md) — the API endpoint consumed by the frontend
- [Memory System](../features/memory/) — how thread history persists
