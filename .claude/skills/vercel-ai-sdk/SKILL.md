---
name: vercel-ai-sdk
description: Build AI features in TypeScript/JavaScript with the Vercel AI SDK (package "ai", version 7) - text generation, streaming chat, structured JSON output, tool calling, agents (ToolLoopAgent), tool approvals, Next.js chat UI with useChat, embeddings. Use when the user wants a chatbot, an AI assistant in a web or mobile app, an AI route in Next.js/Node/Expo, or mentions "AI SDK", "ai package", "useChat", "streamText", "generateText". Checked against the vercel/ai repository (Apache-2.0), ai@7.0.x.
---

# Vercel AI SDK (v7)

Version 7 renamed several APIs. Old tutorials (v3–v5) use names that no longer exist;
always write v7 code and check `node_modules/ai/package.json` before coding.

| Old name (do not use) | v7 |
|---|---|
| `system:` | `instructions:` |
| `generateObject` / `streamObject` | `generateText` / `streamText` with `output: Output.object({ schema })` |
| `maxSteps: 5` / `stepCountIs(5)` | `stopWhen: isStepCount(5)` |
| `parameters:` in `tool()` | `inputSchema:` |
| `useChat` `input` / `handleSubmit` | own `useState` + `sendMessage({ text })`; render `message.parts` |
| `result.toDataStreamResponse()` | `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })` |

## Models

```ts
// Through the Vercel AI Gateway (default global provider): a plain string
model: 'anthropic/claude-sonnet-5.5'

// Direct provider package
import { anthropic } from '@ai-sdk/anthropic';   // npm i @ai-sdk/anthropic
model: anthropic('claude-sonnet-5-5')
```

Keys come from environment variables (`ANTHROPIC_API_KEY`, `AI_GATEWAY_API_KEY`). Never
put a key in client code.

## Text and streaming

```ts
import { generateText, streamText } from 'ai';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-5.5',
  instructions: 'You write short, clear answers in French.',
  prompt: 'Résume cet article : ' + article,
});

const result = streamText({ model: 'anthropic/claude-sonnet-5.5', prompt: '...' });
for await (const part of result.textStream) process.stdout.write(part);
```

## Structured output (JSON with a schema)

```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';

const { output } = await generateText({
  model: 'anthropic/claude-sonnet-5.5',
  output: Output.object({
    schema: z.object({
      product: z.string(),
      price: z.number(),
      inStock: z.boolean(),
    }),
  }),
  prompt: 'Extrais le produit de ce message WhatsApp : ' + message,
});
```

## Tools

```ts
import { generateText, tool, isStepCount } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: 'anthropic/claude-sonnet-5.5',
  tools: {
    orderStatus: tool({
      description: 'Get the delivery status of an order',
      inputSchema: z.object({ orderId: z.string() }),
      execute: async ({ orderId }) => db.getOrderStatus(orderId),
    }),
  },
  stopWhen: isStepCount(5), // always cap the loop
  prompt: 'Où en est ma commande 1234 ?',
});
```

## Agents

```ts
import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-5.5',
  instructions: 'You are the support assistant of a delivery marketplace.',
  tools: { orderStatus, refund },
  toolApproval: { refund: 'user-approval' }, // wait for a human before refunding
});

const { text } = await agent.generate({ prompt: 'Je veux être remboursé.' });
```

`toolApproval` statuses: `'not-applicable'` (default, run), `'approved'`, `'denied'`
(optionally `{ type: 'denied', reason }`), `'user-approval'` (pause and ask). Use it on
every tool that spends money, sends messages, deletes or changes data. Durable
pause/resume across requests uses `WorkflowAgent` (`needsApproval`).

## Next.js chat (App Router)

`app/api/chat/route.ts`:

```ts
import { streamText, UIMessage, convertToModelMessages,
         createUIMessageStreamResponse, toUIMessageStream } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    messages: await convertToModelMessages(messages),
  });
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
```

`app/page.tsx`:

```tsx
'use client';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  return (
    <>
      {messages.map(m => (
        <div key={m.id}>
          {m.parts.map((p, i) => p.type === 'text' ? <p key={i}>{p.text}</p> : null)}
        </div>
      ))}
      <form onSubmit={e => { e.preventDefault(); sendMessage({ text: input }); setInput(''); }}>
        <input value={input} onChange={e => setInput(e.currentTarget.value)} />
      </form>
    </>
  );
}
```

Other frameworks with official guides: Node.js, Expo (React Native), Svelte, Nuxt,
Angular, TanStack Start.

## Other capabilities (see the docs in the repo before using)

Embeddings and reranking (RAG), MCP tools, image, speech, transcription and video
generation, middleware, batch, provider management, testing with mock models. Docs:
`content/docs/03-ai-sdk-core/` and `content/docs/03-agents/` in vercel/ai.

## Gotchas

- `UIMessage` (UI, with metadata) ≠ `ModelMessage` (model input): convert with
  `convertToModelMessages` on the server.
- Render `message.parts`, not `message.content`: tool calls and text are separate parts.
- No `stopWhen` → the tool loop can run longer and cost more than expected.
- Provider-executed tools (run on the provider side) ignore `toolApproval`.
