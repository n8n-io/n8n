# Agent Playground Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dev-only Nuxt 3 app inside `packages/@n8n/agents/playground/` with a Monaco editor for writing agent code and a multi-modal chat interface for interacting with the agent.

**Architecture:** Self-contained Nuxt 3 app (not a workspace package). Monaco editor on the left sends TypeScript to a Nuxt server route that transpiles via esbuild and evals it. Chat on the right sends messages to another server route that calls `agent.run()` and streams responses back via SSE.

**Tech Stack:** Nuxt 3, Vue 3, Monaco Editor, Tailwind CSS, esbuild, SSE streaming, `@n8n/agents` (linked locally)

---

### Task 1: Scaffold Nuxt app

Create the Nuxt 3 app inside the agents package. This is NOT a workspace package — it has its own isolated `package.json`.

**Files:**
- Create: `packages/@n8n/agents/playground/package.json`
- Create: `packages/@n8n/agents/playground/nuxt.config.ts`
- Create: `packages/@n8n/agents/playground/tsconfig.json`
- Create: `packages/@n8n/agents/playground/app.vue`
- Create: `packages/@n8n/agents/playground/.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "@n8n/agents-playground",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview"
  },
  "dependencies": {
    "@n8n/agents": "file:..",
    "nuxt": "^3.17.0",
    "monaco-editor": "^0.52.0",
    "esbuild": "^0.25.0",
    "zod": "^3.25.0",
    "marked": "^15.0.0"
  },
  "devDependencies": {
    "@nuxtjs/tailwindcss": "^6.12.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create nuxt.config.ts**

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  ssr: false,
  devtools: { enabled: false },
  typescript: { strict: true },
  vite: {
    optimizeDeps: {
      include: ['monaco-editor'],
    },
  },
});
```

**Step 3: Create tsconfig.json**

```json
{
  "extends": "./.nuxt/tsconfig.json"
}
```

**Step 4: Create .gitignore**

```
node_modules/
.nuxt/
.output/
dist/
```

**Step 5: Create app.vue (minimal shell)**

```vue
<template>
  <div class="h-screen flex flex-col bg-gray-950 text-gray-100">
    <header class="flex items-center justify-between px-4 py-2 border-b border-gray-800">
      <h1 class="text-lg font-semibold">@n8n/agents playground</h1>
      <div class="flex items-center gap-2">
        <span
          :class="agentStatus === 'active' ? 'bg-green-500' : agentStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'"
          class="w-2 h-2 rounded-full"
        />
        <span class="text-sm text-gray-400">{{ statusText }}</span>
      </div>
    </header>
    <div class="flex flex-1 overflow-hidden">
      <div class="w-1/2 border-r border-gray-800">
        <EditorPane
          v-model="code"
          @compile-status="onCompileStatus"
        />
      </div>
      <div class="w-1/2">
        <ChatPane :agent-ready="agentStatus === 'active'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const code = ref('');
const agentStatus = ref<'idle' | 'compiling' | 'active' | 'error'>('idle');

const statusText = computed(() => {
  switch (agentStatus.value) {
    case 'idle': return 'No agent loaded';
    case 'compiling': return 'Compiling...';
    case 'active': return 'Agent active';
    case 'error': return 'Compilation error';
  }
});

function onCompileStatus(status: 'compiling' | 'active' | 'error') {
  agentStatus.value = status;
}
</script>
```

**Step 6: Install dependencies and verify dev server starts**

```bash
cd packages/@n8n/agents/playground
pnpm install
pnpm dev
```

Expected: Nuxt dev server starts at http://localhost:3000 showing the shell layout.

**Step 7: Commit**

```bash
git add packages/@n8n/agents/playground/
git commit -m "feat(playground): scaffold Nuxt 3 app for agent testing"
```

---

### Task 2: Monaco editor component

Create the editor pane with Monaco, pre-loaded with a starter agent template. Sends code to the compile endpoint on debounced changes.

**Files:**
- Create: `packages/@n8n/agents/playground/components/EditorPane.vue`
- Create: `packages/@n8n/agents/playground/composables/useAgentCompiler.ts`

**Step 1: Create the compiler composable**

```typescript
// composables/useAgentCompiler.ts

export function useAgentCompiler() {
  const status = ref<'idle' | 'compiling' | 'active' | 'error'>('idle');
  const error = ref<string | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function compile(source: string) {
    status.value = 'compiling';
    error.value = null;

    try {
      const response = await $fetch('/api/agent/compile', {
        method: 'POST',
        body: { source },
      });

      if (response.ok) {
        status.value = 'active';
        error.value = null;
      } else {
        status.value = 'error';
        error.value = response.error ?? 'Unknown compilation error';
      }
    } catch (e) {
      status.value = 'error';
      error.value = e instanceof Error ? e.message : 'Failed to compile';
    }
  }

  function compileDebounced(source: string, delay = 500) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => compile(source), delay);
  }

  return { status, error, compile, compileDebounced };
}
```

**Step 2: Create the EditorPane component**

```vue
<!-- components/EditorPane.vue -->
<template>
  <div class="h-full flex flex-col">
    <div ref="editorContainer" class="flex-1" />
    <div
      v-if="compiler.error.value"
      class="px-4 py-2 bg-red-950 text-red-300 text-sm font-mono border-t border-red-800 max-h-32 overflow-auto"
    >
      {{ compiler.error.value }}
    </div>
  </div>
</template>

<script setup lang="ts">
import * as monaco from 'monaco-editor';

const emit = defineEmits<{
  'compile-status': ['compiling' | 'active' | 'error'];
  'update:modelValue': [string];
}>();

const props = defineProps<{ modelValue: string }>();
const editorContainer = ref<HTMLElement | null>(null);
const compiler = useAgentCompiler();

let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const STARTER_TEMPLATE = `import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

const greetTool = new Tool('greet')
  .description('Greet someone by name')
  .input(z.object({ name: z.string() }))
  .handler(async ({ name }) => ({ message: \`Hello, \${name}!\` }))
  .build();

const agent = new Agent('assistant')
  .model('anthropic/claude-sonnet-4')
  .instructions('You are a friendly assistant. Use the greet tool when asked to say hello.')
  .tool(greetTool)
  .build();

export default agent;
`;

watch(() => compiler.status.value, (s) => {
  if (s !== 'idle') emit('compile-status', s as 'compiling' | 'active' | 'error');
});

onMounted(() => {
  if (!editorContainer.value) return;

  monaco.editor.defineTheme('n8n-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0a0a0a',
    },
  });

  editor = monaco.editor.create(editorContainer.value, {
    value: STARTER_TEMPLATE,
    language: 'typescript',
    theme: 'n8n-dark',
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    padding: { top: 16 },
  });

  editor.onDidChangeModelContent(() => {
    const value = editor!.getValue();
    emit('update:modelValue', value);
    compiler.compileDebounced(value);
  });

  // Initial compile
  compiler.compile(STARTER_TEMPLATE);
});

onUnmounted(() => {
  editor?.dispose();
});
</script>
```

**Step 3: Verify editor renders**

Run `pnpm dev`, check that Monaco loads with the starter template and the
status indicator changes.

**Step 4: Commit**

```bash
git add packages/@n8n/agents/playground/components/ packages/@n8n/agents/playground/composables/
git commit -m "feat(playground): add Monaco editor with debounced auto-compile"
```

---

### Task 3: Compile server route

The server route that transpiles TypeScript agent code via esbuild and evals it.

**Files:**
- Create: `packages/@n8n/agents/playground/server/api/agent/compile.post.ts`
- Create: `packages/@n8n/agents/playground/server/utils/agent-runtime.ts`

**Step 1: Create the agent runtime (server-side singleton)**

```typescript
// server/utils/agent-runtime.ts

import type { BuiltAgent } from '@n8n/agents';

let currentAgent: BuiltAgent | null = null;

export function getActiveAgent(): BuiltAgent | null {
  return currentAgent;
}

export function setActiveAgent(agent: BuiltAgent): void {
  currentAgent = agent;
}

export function clearAgent(): void {
  currentAgent = null;
}
```

**Step 2: Create the compile endpoint**

```typescript
// server/api/agent/compile.post.ts

import { transform } from 'esbuild';
import * as agents from '@n8n/agents';
import * as zod from 'zod';
import { setActiveAgent, clearAgent } from '../../utils/agent-runtime';

export default defineEventHandler(async (event) => {
  const body = await readBody<{ source: string }>(event);

  if (!body?.source?.trim()) {
    return { ok: false, error: 'No source code provided' };
  }

  try {
    // Transpile TypeScript to JavaScript
    const result = await transform(body.source, {
      loader: 'ts',
      format: 'cjs',
      target: 'es2022',
    });

    // Create a module context with @n8n/agents and zod available
    const moduleExports: Record<string, unknown> = {};
    const moduleRequire = (id: string) => {
      if (id === '@n8n/agents') return agents;
      if (id === 'zod') return zod;
      throw new Error(`Module "${id}" is not available in the playground`);
    };

    // Rewrite imports to requires (esbuild handles this with format: 'cjs')
    const fn = new Function('exports', 'require', 'module', result.code);
    const module = { exports: moduleExports };
    fn(moduleExports, moduleRequire, module);

    // Extract the agent from default export or module.exports
    const exported = module.exports.default ?? module.exports;

    if (!exported || typeof exported !== 'object' || !('run' in exported)) {
      return {
        ok: false,
        error: 'No agent found. Export a built agent as default: export default agent;',
      };
    }

    setActiveAgent(exported as agents.BuiltAgent);

    return { ok: true };
  } catch (e) {
    clearAgent();
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown compilation error',
    };
  }
});
```

**Step 3: Verify compile endpoint works**

Start the dev server, check that the starter template auto-compiles and the
status shows "Agent active".

**Step 4: Commit**

```bash
git add packages/@n8n/agents/playground/server/
git commit -m "feat(playground): add compile server route with esbuild transpilation"
```

---

### Task 4: Chat server route (SSE streaming)

Server route that takes a message (with optional file attachments), calls the
active agent, and streams the response.

**Files:**
- Create: `packages/@n8n/agents/playground/server/api/agent/chat.post.ts`

**Step 1: Create the chat endpoint**

```typescript
// server/api/agent/chat.post.ts

import { getActiveAgent } from '../../utils/agent-runtime';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  files?: Array<{
    name: string;
    type: string;
    data: string; // base64
  }>;
}

interface ChatRequest {
  message: string;
  files?: Array<{
    name: string;
    type: string;
    data: string;
  }>;
  history: ChatMessage[];
}

export default defineEventHandler(async (event) => {
  const agent = getActiveAgent();

  if (!agent) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No agent is currently active. Write agent code in the editor.',
    });
  }

  const body = await readBody<ChatRequest>(event);

  if (!body?.message?.trim() && (!body?.files || body.files.length === 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message or files required',
    });
  }

  // Build the prompt — include file references if present
  let prompt = body.message ?? '';
  if (body.files && body.files.length > 0) {
    const fileDescriptions = body.files
      .map((f) => `[Attached file: ${f.name} (${f.type})]`)
      .join('\n');
    prompt = `${fileDescriptions}\n\n${prompt}`;
  }

  try {
    const run = agent.run(prompt, {
      threadId: 'playground-session',
      resourceId: 'playground-user',
    });

    const result = await run.result;

    return {
      text: result.text,
      toolCalls: result.toolCalls,
      tokens: result.tokens,
      steps: result.steps,
    };
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: e instanceof Error ? e.message : 'Agent execution failed',
    });
  }
});
```

**Step 2: Commit**

```bash
git add packages/@n8n/agents/playground/server/api/agent/chat.post.ts
git commit -m "feat(playground): add chat server route"
```

---

### Task 5: Chat UI component

The chat interface with message history, markdown rendering, file upload, and
streaming display.

**Files:**
- Create: `packages/@n8n/agents/playground/components/ChatPane.vue`
- Create: `packages/@n8n/agents/playground/components/ChatMessage.vue`
- Create: `packages/@n8n/agents/playground/components/FileUpload.vue`

**Step 1: Create the ChatMessage component**

```vue
<!-- components/ChatMessage.vue -->
<template>
  <div :class="['flex gap-3 px-4 py-3', msg.role === 'user' ? 'bg-gray-900/50' : '']">
    <div
      :class="[
        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
        msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600',
      ]"
    >
      {{ msg.role === 'user' ? 'U' : 'A' }}
    </div>
    <div class="flex-1 min-w-0">
      <!-- File previews -->
      <div v-if="msg.files?.length" class="flex gap-2 mb-2 flex-wrap">
        <div
          v-for="file in msg.files"
          :key="file.name"
          class="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
        >
          <span>📎</span>
          <span>{{ file.name }}</span>
        </div>
      </div>
      <!-- Message content with markdown -->
      <div class="prose prose-invert prose-sm max-w-none" v-html="rendered" />
      <!-- Token info for assistant messages -->
      <div v-if="msg.role === 'assistant' && msg.tokens" class="mt-1 text-xs text-gray-500">
        {{ msg.tokens.input + msg.tokens.output }} tokens
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked';

const props = defineProps<{
  msg: {
    role: 'user' | 'assistant';
    content: string;
    files?: Array<{ name: string; type: string; data: string }>;
    tokens?: { input: number; output: number };
  };
}>();

const rendered = computed(() => {
  try {
    return marked.parse(props.msg.content, { breaks: true });
  } catch {
    return props.msg.content;
  }
});
</script>
```

**Step 2: Create the FileUpload component**

```vue
<!-- components/FileUpload.vue -->
<template>
  <div>
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*,.pdf,.csv,.txt,.json,.md"
      class="hidden"
      @change="onFileSelect"
    />
    <button
      class="p-2 text-gray-400 hover:text-gray-200 transition-colors"
      title="Attach files"
      @click="fileInput?.click()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
export interface UploadedFile {
  name: string;
  type: string;
  data: string; // base64
}

const emit = defineEmits<{
  files: [UploadedFile[]];
}>();

const fileInput = ref<HTMLInputElement | null>(null);

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const promises = Array.from(input.files).map(
    (file) =>
      new Promise<UploadedFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            data: (reader.result as string).split(',')[1], // strip data URL prefix
          });
        };
        reader.readAsDataURL(file);
      }),
  );

  Promise.all(promises).then((files) => {
    emit('files', files);
    input.value = ''; // reset so same file can be re-selected
  });
}
</script>
```

**Step 3: Create the ChatPane component**

```vue
<!-- components/ChatPane.vue -->
<template>
  <div class="h-full flex flex-col">
    <!-- Messages -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto">
      <div v-if="messages.length === 0" class="flex items-center justify-center h-full text-gray-500">
        <p>Send a message to start chatting with the agent.</p>
      </div>
      <ChatMessage v-for="(msg, i) in messages" :key="i" :msg="msg" />
      <!-- Loading indicator -->
      <div v-if="loading" class="flex gap-3 px-4 py-3">
        <div class="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">
          A
        </div>
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
          <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.1s]" />
          <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
        </div>
      </div>
    </div>

    <!-- Attached files preview -->
    <div v-if="pendingFiles.length" class="px-4 py-2 border-t border-gray-800 flex gap-2 flex-wrap">
      <div
        v-for="(file, i) in pendingFiles"
        :key="file.name"
        class="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
      >
        <span>📎 {{ file.name }}</span>
        <button class="text-gray-500 hover:text-gray-300" @click="pendingFiles.splice(i, 1)">×</button>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t border-gray-800 p-4">
      <div class="flex items-end gap-2">
        <FileUpload @files="onFiles" />
        <textarea
          v-model="input"
          :disabled="!agentReady || loading"
          placeholder="Type a message..."
          rows="1"
          class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-500 disabled:opacity-50"
          @keydown.enter.exact.prevent="send"
        />
        <button
          :disabled="!agentReady || loading || (!input.trim() && !pendingFiles.length)"
          class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
          @click="send"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadedFile } from './FileUpload.vue';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: UploadedFile[];
  tokens?: { input: number; output: number };
}

const props = defineProps<{ agentReady: boolean }>();

const input = ref('');
const messages = ref<Message[]>([]);
const loading = ref(false);
const pendingFiles = ref<UploadedFile[]>([]);
const messagesContainer = ref<HTMLElement | null>(null);

function onFiles(files: UploadedFile[]) {
  pendingFiles.value.push(...files);
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

async function send() {
  const text = input.value.trim();
  const files = [...pendingFiles.value];

  if (!text && files.length === 0) return;

  // Add user message
  messages.value.push({ role: 'user', content: text, files: files.length > 0 ? files : undefined });
  input.value = '';
  pendingFiles.value = [];
  loading.value = true;
  scrollToBottom();

  try {
    const response = await $fetch('/api/agent/chat', {
      method: 'POST',
      body: {
        message: text,
        files,
        history: messages.value,
      },
    });

    messages.value.push({
      role: 'assistant',
      content: response.text,
      tokens: response.tokens,
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Failed to get response';
    messages.value.push({
      role: 'assistant',
      content: `**Error:** ${errorMessage}`,
    });
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}
</script>
```

**Step 4: Verify full flow works**

Start dev server, write agent code in editor, wait for "Agent active" status,
send a message in chat. Verify response appears.

**Step 5: Commit**

```bash
git add packages/@n8n/agents/playground/components/
git commit -m "feat(playground): add chat UI with file upload and markdown rendering"
```

---

### Task 6: Drag-and-drop file support + polish

Add drag-and-drop to the chat area and general UX polish.

**Files:**
- Modify: `packages/@n8n/agents/playground/components/ChatPane.vue`
- Modify: `packages/@n8n/agents/playground/app.vue`

**Step 1: Add drag-and-drop to ChatPane**

Add to the `<template>` wrapping div:

```html
<div
  class="h-full flex flex-col relative"
  @dragover.prevent="dragOver = true"
  @dragleave.prevent="dragOver = false"
  @drop.prevent="onDrop"
>
  <!-- Drop overlay -->
  <div
    v-if="dragOver"
    class="absolute inset-0 z-10 bg-blue-600/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center"
  >
    <p class="text-blue-300 text-lg font-medium">Drop files here</p>
  </div>
  <!-- ... rest of template ... -->
</div>
```

Add to `<script setup>`:

```typescript
const dragOver = ref(false);

function onDrop(event: DragEvent) {
  dragOver.value = false;
  const files = event.dataTransfer?.files;
  if (!files?.length) return;

  const promises = Array.from(files).map(
    (file) =>
      new Promise<UploadedFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            data: (reader.result as string).split(',')[1],
          });
        };
        reader.readAsDataURL(file);
      }),
  );

  Promise.all(promises).then((uploaded) => {
    pendingFiles.value.push(...uploaded);
  });
}
```

**Step 2: Add tailwind prose plugin**

If not already included via `@nuxtjs/tailwindcss`, create a minimal
`tailwind.config.ts`:

```typescript
// packages/@n8n/agents/playground/tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: [],
  theme: { extend: {} },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;
```

Add to package.json dependencies: `"@tailwindcss/typography": "^0.5.0"`

**Step 3: Verify drag-and-drop works**

Drag an image file onto the chat area, verify it appears in the pending files
preview. Send the message with the file attached.

**Step 4: Commit**

```bash
git add packages/@n8n/agents/playground/
git commit -m "feat(playground): add drag-and-drop file upload and polish"
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 1 | Nuxt 3 scaffold with Tailwind, split-pane layout |
| 2 | Monaco editor with starter template, debounced compile |
| 3 | Server route: esbuild transpile → eval → store agent |
| 4 | Server route: chat with agent, return response |
| 5 | Chat UI: messages, markdown, file upload, loading states |
| 6 | Drag-and-drop, typography plugin, polish |

After Task 6, you'll have a working dev playground: write agent code on the
left, chat with it on the right, upload files, see markdown-rendered responses.
