# AI Agent Framework Comparison: Vercel AI SDK vs Mastra vs LangChain/LangGraph

**Date:** 2026-02-24 (updated 2026-02-26)
**Status:** Draft
**Scope:** Evaluate the best TypeScript framework for building the AI agent layer of n8n's new code-based workflow engine

## Context

n8n is building a new code-first workflow engine as a parallel offering to the
existing visual editor. A separate team handles the execution runtime (durable
execution, checkpointing, resume). This document evaluates frameworks for the
**AI agent layer** -- the primitives developers use to define agents, tools, and
multi-agent workflows in TypeScript.

**Requirements:**
- TypeScript-first
- Provider-neutral (must support any major LLM provider)
- Production-grade
- Composable -- the agent layer is a library, not a framework that owns execution

## Shortlisting

From an initial evaluation of 10+ frameworks, three serious contenders emerged:

| Framework | npm/week | Stars | Providers | License |
|-----------|----------|-------|-----------|---------|
| **Vercel AI SDK 6** | 8.3M | 22k | 25+ official, 40+ community | Apache 2.0 |
| **Mastra** | 437k | 21.3k | 81 providers, 2,400+ models | Apache 2.0 |
| **LangChain/LangGraph.js** | 1.8M / 1.4M | 17k / 2.6k | Via LangChain integrations | MIT |

**Eliminated:**
- Agent Orchestrator TS -- 5 stars, 8 commits, dormant proof-of-concept
- TS-Agents -- 5 stars, author says "by no means production ready"
- KaibanJS -- 102 npm downloads/week, JavaScript-first
- OpenAI Agents SDK -- OpenAI-locked, adapters for other providers are second-class

**Key architectural relationships:**

- **Mastra** is built on top of the Vercel AI SDK. It uses the AI SDK's provider
  system and core primitives internally, then adds higher-level abstractions.
- **LangChain.js** is the foundation library providing model abstractions, tool
  definitions, and composable chains. **LangGraph.js** sits on top, adding
  graph-based stateful agent orchestration with durable execution primitives.
  For agent use cases, LangGraph is the recommended framework — LangChain alone
  is insufficient for production agents.
- The comparison is effectively: "AI SDK primitives alone" vs "AI SDK + Mastra's
  opinionated layer" vs "LangChain + LangGraph's graph-based approach."

---

## Dimension-by-Dimension Comparison

### 1. Memory / Context

| Capability | Vercel AI SDK | Mastra | LangChain/LangGraph |
|---|---|---|---|
| Conversation history | Manual -- you manage the message array | Built-in thread-based storage, configurable window | Checkpointer-based -- thread-scoped state persistence |
| Long-term memory | None built-in | Three-tier: history + semantic recall + working memory | Store-based -- namespaced cross-thread memory with semantic search |
| Observational memory | No | Observer + Reflector agents compress history (94.87% LongMemEval) | Via LangMem SDK -- extract, consolidate, summarize memories |
| RAG | Embedding + reranking primitives | Full pipeline: chunking, embedding, storage, retrieval | Full pipeline via LangChain document loaders, splitters, vector stores |
| Token management | No built-in counting or window management | Handled implicitly by memory tiers | Configurable via message trimming and summarization strategies |

#### Vercel AI SDK

The SDK is stateless by default. You store and load `UIMessage[]` yourself:

```typescript
import { generateText, convertToModelMessages, UIMessage } from 'ai';

// You manage persistence (file, DB, Redis, etc.)
async function chat(messages: UIMessage[], chatId: string) {
  const result = await generateText({
    model: 'openai/gpt-4o',
    messages: await convertToModelMessages(messages),
  });
  await saveChat({ chatId, messages: [...messages, result.message] });
  return result;
}
```

RAG uses `embed()` / `embedMany()` / `cosineSimilarity()` primitives -- you wire
up the vector DB yourself:

```typescript
import { embed, embedMany, cosineSimilarity } from 'ai';

const { embeddings } = await embedMany({
  model: 'openai/text-embedding-3-small',
  values: chunks,
});

const { embedding } = await embed({
  model: 'openai/text-embedding-3-small',
  value: 'user query',
});

const results = db
  .map(item => ({ item, score: cosineSimilarity(embedding, item.embedding) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);
```

#### Mastra

Three-tier memory system with thread-based persistence:

```typescript
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { z } from 'zod';

const agent = new Agent({
  name: 'assistant',
  model: 'openai/gpt-4o',
  memory: new Memory({
    options: {
      lastMessages: 20,
      semanticRecall: {
        topK: 4,
        messageRange: { before: 1, after: 1 },
      },
      workingMemory: {
        enabled: true,
        scope: 'resource',
        schema: z.object({
          name: z.string().optional(),
          preferences: z.record(z.string()).optional(),
        }),
      },
    },
  }),
});

// Thread-based calls automatically preserve context
await agent.generate('My name is Alice', {
  memory: { resource: 'user-123', thread: 'conv-abc' },
});
```

Full RAG pipeline with document chunking and vector store adapters:

```typescript
import { MDocument } from '@mastra/rag';
import { createVectorQueryTool } from '@mastra/rag';
import { PgVector } from '@mastra/pg';

const doc = MDocument.fromText(rawText);
const chunks = await doc.chunk({ strategy: 'recursive', size: 512, overlap: 50 });

const pgVector = new PgVector({ connectionString: process.env.PG_URL! });
await pgVector.upsert({ indexName: 'docs', vectors: embeddings, metadata: chunks });

const queryTool = createVectorQueryTool({
  vectorStoreName: 'pgVector',
  indexName: 'docs',
  model: 'openai/text-embedding-3-small',
});
```

#### LangChain/LangGraph

Checkpointer-based short-term memory with Store-based long-term memory:

```typescript
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver, InMemoryStore } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

const checkpointer = new MemorySaver();
const store = new InMemoryStore();

const agent = createReactAgent({
  llm: new ChatOpenAI({ model: 'gpt-4o' }),
  tools: [searchTool],
  checkpointSaver: checkpointer,
  store,
});

// Thread-scoped conversation history via checkpointer
await agent.invoke(
  { messages: [{ role: 'user', content: 'My name is Alice' }] },
  { configurable: { thread_id: 'conv-abc' } },
);

// Cross-thread long-term memory via Store
// Store supports semantic search + filtering by content
await store.put('user-123', 'preferences', {
  value: { name: 'Alice', theme: 'dark' },
});
```

RAG via LangChain's document pipeline:

```typescript
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { OpenAIEmbeddings } from '@langchain/openai';

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 50,
});
const chunks = await splitter.createDocuments([rawText]);

const vectorStore = await PGVectorStore.fromDocuments(
  chunks,
  new OpenAIEmbeddings(),
  { postgresConnectionOptions: { connectionString: process.env.PG_URL } },
);

const retriever = vectorStore.asRetriever({ k: 4 });
const results = await retriever.invoke('user query');
```

**Verdict: Mastra wins on integrated DX.** LangGraph's checkpointer + Store
system is powerful and production-ready, but requires more wiring than Mastra's
declarative three-tier approach. LangGraph's Store semantic search is a strong
feature. AI SDK remains primitives-only.

---

### 2. Tools

| Capability | Vercel AI SDK | Mastra | LangChain/LangGraph |
|---|---|---|---|
| Definition | `tool()` with Zod schemas | `createTool()` with Zod input + output schemas | `tool()` with Zod schemas or `DynamicStructuredTool` |
| Dynamic tools | `dynamicTool()` for runtime-unknown schemas | Via MCP dynamic discovery | Via MCP adapters (`@langchain/mcp-adapters`) |
| MCP support | Client only (Stdio, HTTP, SSE) | Client AND server | Client via MCP adapters (Stdio, SSE) |
| Tool approval | `needsApproval` per-tool (boolean or async) | Workspace-level `requireApproval` | Via graph interrupt before tool node |
| Active tools | `activeTools` to restrict per-request | Tools assigned at agent creation | Tools bound to model at agent creation |
| Tool repair | Built-in `experimental_repairToolCall` | Not built-in | Via output parsers and retry chains |

#### Vercel AI SDK

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  strict: true,
  needsApproval: async ({ location }) => location.includes('classified'),
  execute: async ({ location }) => ({
    temperature: 72,
    condition: 'sunny',
  }),
  // Control what goes back into agent context
  toModelOutput: async ({ input, output }) => ({
    type: 'text',
    value: `Weather in ${input.location}: ${output.temperature}F`,
  }),
});

// Restrict tools per-request
const result = await generateText({
  model: 'openai/gpt-4o',
  tools: { weather: weatherTool, calendar, email },
  activeTools: ['weather', 'calendar'], // email excluded this call
});
```

#### Mastra

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    condition: z.string(),
  }),
  execute: async ({ inputData }) => ({
    temperature: 72,
    condition: 'sunny',
  }),
});
```

#### LangChain/LangGraph

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const weatherTool = tool(
  async ({ location }) => {
    const data = await fetch(`https://api.weather.com?q=${location}`);
    return JSON.stringify(await data.json());
  },
  {
    name: 'get-weather',
    description: 'Get weather for a location',
    schema: z.object({
      location: z.string().describe('City name'),
    }),
  },
);

// Bind tools to model
const model = new ChatOpenAI({ model: 'gpt-4o' });
const modelWithTools = model.bindTools([weatherTool]);
```

**Verdict: Tie.** AI SDK has more granular control (active tools, dynamic tools,
repair, `toModelOutput`). Mastra adds MCP server support and workspace
permissions. LangChain has the largest pre-built tool/integration ecosystem
(40+ integration packages). All use Zod and are fully typed.

---

### 3. Models / Providers

| Capability | Vercel AI SDK | Mastra | LangChain/LangGraph |
|---|---|---|---|
| Provider count | 25+ official, 40+ community | 81 providers, 2,400+ models | 20+ official integration packages |
| Setup | Install per-provider package | Zero package installs -- `"provider/model"` string | Install per-provider package (`@langchain/openai`, etc.) |
| Fallback | Via AI Gateway (hosted) or custom | Built-in `model: [...]` array with retry config | Via `modelWithFallbacks()` or custom retry middleware |
| Registry | `createProviderRegistry()` | Built-in -- all models as `"provider/model"` | `initChatModel('provider/model')` configurable factory |
| Custom providers | `createOpenAICompatible()` or implement spec | `MastraModelGateway` for custom endpoints | Extend `BaseChatModel` or use OpenAI-compatible wrapper |

#### Vercel AI SDK

```typescript
import { createProviderRegistry, customProvider } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

// Provider registry for string-based access
const registry = createProviderRegistry({ openai, anthropic });
const model = registry.languageModel('anthropic:claude-sonnet-4');

// Custom provider with aliases
const myProvider = customProvider({
  languageModels: {
    fast: openai('gpt-4o-mini'),
    smart: anthropic('claude-sonnet-4'),
  },
  fallbackProvider: openai,
});
```

#### Mastra

```typescript
import { Agent } from '@mastra/core/agent';

// Zero-install model routing
const agent = new Agent({
  name: 'resilient',
  model: [
    { model: 'openai/gpt-4o', maxRetries: 3 },
    { model: 'anthropic/claude-sonnet-4', maxRetries: 2 },
    { model: 'google/gemini-2.5-flash', maxRetries: 2 },
  ],
});
```

#### LangChain/LangGraph

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { initChatModel } from 'langchain/chat_models/universal';

// Per-provider package installs required
const openai = new ChatOpenAI({ model: 'gpt-4o' });
const anthropic = new ChatAnthropic({ model: 'claude-sonnet-4' });

// Universal model factory (string-based)
const model = await initChatModel('gpt-4o', { modelProvider: 'openai' });

// Fallback with retry
const resilientModel = openai.withFallbacks({
  fallbacks: [anthropic],
});
```

**Verdict: Mastra wins on DX.** The `"provider/model"` string format with zero
extra installs and native fallback arrays is cleaner. LangChain has broad
provider coverage but requires per-provider package installs like AI SDK.
Both Mastra and AI SDK have broader coverage since Mastra uses AI SDK providers
under the hood.

---

### 4. Tracing / Monitoring / Observability

| Capability | Vercel AI SDK | Mastra | LangChain/LangGraph |
|---|---|---|---|
| Foundation | OpenTelemetry spans on all core functions | Dual: AI Tracing + OpenTelemetry | Callback system + OpenTelemetry via LangSmith |
| Exporters | None built-in -- wire up OTel collectors | Langfuse, Braintrust, LangSmith, Arize, OTEL packages | LangSmith (proprietary), Langfuse, OpenTelemetry |
| DevTools | `npx @ai-sdk/devtools` | Local dev server with UI | LangSmith UI (cloud) + LangGraph Studio (local) |
| Scope | Model calls, tool executions, token usage | + workflow runs, memory operations | + graph traversal, state transitions, checkpoints |
| Opt-in | Per-call `experimental_telemetry` flag | Automatic for all registered agents/workflows | Automatic via env var (`LANGSMITH_TRACING=true`) |

#### Vercel AI SDK

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { generateText } from 'ai';

const sdk = new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] });
sdk.start();

const { text } = await generateText({
  model: 'openai/gpt-4o',
  prompt: 'Hello',
  experimental_telemetry: {
    isEnabled: true,
    functionId: 'my-handler',
    metadata: { userId: '123' },
  },
});
```

#### Mastra

```typescript
import { Mastra } from '@mastra/core';
import { LangfuseExporter } from '@mastra/langfuse';

const mastra = new Mastra({
  agents: { myAgent },
  observability: {
    configs: {
      langfuse: {
        serviceName: 'my-service',
        exporters: [
          new LangfuseExporter({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
            secretKey: process.env.LANGFUSE_SECRET_KEY!,
          }),
        ],
      },
    },
  },
});
// Tracing is automatic for all agents -- no per-call opt-in
```

#### LangChain/LangGraph

```typescript
// Single env var enables tracing to LangSmith (proprietary cloud)
// LANGSMITH_TRACING=true
// LANGSMITH_API_KEY=...

// Or use OpenTelemetry export
import { AISDKExporter } from 'langsmith/vercel';
// LangSmith supports full OTel pipeline with LangChain instrumentation

// Third-party: Langfuse callback handler
import { CallbackHandler } from 'langfuse-langchain';

const handler = new CallbackHandler({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
});

await agent.invoke(
  { messages: [{ role: 'user', content: 'Hello' }] },
  { callbacks: [handler] },
);
```

**Verdict: LangGraph and Mastra tie.** LangGraph traces graph traversal and
state transitions automatically (via env var), but pushes toward LangSmith
(proprietary) as the primary observability platform. Mastra ships open-source
exporter packages and traces are fully open. AI SDK gives a solid OTel
foundation but you wire everything yourself.

---

### 5. Orchestration

| Capability | Vercel AI SDK | Mastra | LangChain/LangGraph |
|---|---|---|---|
| Single agent loop | `ToolLoopAgent` with `stopWhen` | `agent.generate()` / `agent.stream()` | `createReactAgent()` with configurable recursion limit |
| Multi-agent | Agents-as-tools (manual wiring) | Agent Networks with automatic routing | Supervisor pattern (`@langchain/langgraph-supervisor`) |
| Workflows | Plain async/await patterns | Graph-based engine: `.then()`, `.parallel()`, `.branch()` | `StateGraph` with nodes, edges, conditional routing |
| Agents in workflows | N/A | Agents can be workflow steps | Agents are graph nodes -- first-class composition |
| Durable execution | Not built-in (integrate Restate) | Workflow-level snapshots (persisted to storage); no agent-loop checkpointing | Graph-level checkpointer (persisted to storage); no intra-node checkpointing |

#### Vercel AI SDK

Multi-agent via agents-as-tools -- you wire the orchestration yourself:

```typescript
import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { z } from 'zod';

const researcher = new ToolLoopAgent({
  model: 'openai/gpt-4o',
  instructions: 'Research specialist.',
  tools: { search },
  stopWhen: stepCountIs(5),
});

const orchestrator = new ToolLoopAgent({
  model: 'openai/gpt-4o',
  instructions: 'Coordinate research and writing.',
  tools: {
    research: tool({
      description: 'Delegate research to specialist.',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const result = await researcher.generate({ prompt: query });
        return result.text;
      },
    }),
  },
  stopWhen: stepCountIs(10),
});
```

Workflow patterns are plain TypeScript:

```typescript
// Sequential
const step1 = await generateText({ model, prompt: 'Classify...' });
const step2 = await generateText({ model, prompt: `Based on ${step1.text}...` });

// Parallel
const [a, b, c] = await Promise.all([
  generateText({ model, prompt: 'Review security...' }),
  generateText({ model, prompt: 'Review performance...' }),
  generateText({ model, prompt: 'Review style...' }),
]);

// Branching
const handler = step1.text.includes('urgent') ? handleUrgent : handleNormal;
```

#### Mastra

Agent Networks with LLM-based routing:

```typescript
import { Agent } from '@mastra/core/agent';

const researcher = new Agent({ id: 'researcher', name: 'Researcher', /* ... */ });
const writer = new Agent({ id: 'writer', name: 'Writer', /* ... */ });

const coordinator = new Agent({
  id: 'coordinator',
  name: 'Coordinator',
  model: 'openai/gpt-4o',
  agents: { researcher, writer },
});

const result = await coordinator.network().loop(
  'Research top cities in Japan, then write a travel guide'
);
```

Graph-based workflow engine:

```typescript
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

const classify = createStep({
  id: 'classify',
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: z.object({ category: z.string() }),
  execute: async ({ inputData }) => ({ category: 'technical' }),
});

const workflow = createWorkflow({
  id: 'pipeline',
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: z.object({ draft: z.string() }),
})
  .then(classify)
  .branch([
    [async ({ inputData }) => inputData.category === 'technical', writeTechnical],
    [async ({ inputData }) => inputData.category === 'marketing', writeMarketing],
  ])
  .commit();
```

#### LangChain/LangGraph

Graph-based orchestration with `StateGraph`:

```typescript
import { StateGraph, Annotation } from '@langchain/langgraph';

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: (a, b) => [...a, ...b] }),
  category: Annotation<string>(),
});

const graph = new StateGraph(AgentState)
  .addNode('classify', classifyNode)
  .addNode('research', researchNode)
  .addNode('write', writeNode)
  .addEdge('__start__', 'classify')
  .addConditionalEdges('classify', routeByCategory, {
    technical: 'research',
    marketing: 'write',
  })
  .addEdge('research', 'write')
  .addEdge('write', '__end__')
  .compile({ checkpointer: new MemorySaver() });

await graph.invoke({ messages: [new HumanMessage('Write about RAG')] });
```

Multi-agent via supervisor:

```typescript
import { createSupervisor } from '@langchain/langgraph-supervisor';

const supervisor = createSupervisor({
  agents: [researchAgent, writerAgent],
  model: new ChatOpenAI({ model: 'gpt-4o' }),
  prompt: 'Route tasks to the right specialist.',
});

const app = supervisor.compile({ checkpointer: new MemorySaver() });
await app.invoke({
  messages: [new HumanMessage('Research RAG and write a summary')],
});
```

**Verdict: LangGraph wins on orchestration depth.** Its graph-based model with
built-in checkpointing is the most mature orchestration framework. However,
both LangGraph and Mastra provide checkpointing at the *workflow/graph* level,
not inside the agent loop itself — if a process crashes mid-agent-execution
(between LLM calls and tool calls within a single agent node/step), both lose
that in-progress work. LangGraph's advantage is that its graph model is more
granular (each tool call can be a separate node), while Mastra checkpoints at
step boundaries. Both overlap significantly with the execution runtime team's
scope. AI SDK gives maximum flexibility via plain TypeScript.

---

### 6. Human in the Loop

| Capability | Vercel AI SDK | Mastra | LangChain/LangGraph |
|---|---|---|---|
| Tool-level approval | `needsApproval` per-tool | Workspace `requireApproval` per-tool-type | `interrupt()` before tool node execution |
| Workflow suspension | N/A (no workflow engine) | `suspend()` / `resume()` with typed schemas | `interrupt()` / `Command` with state update |
| Client integration | React `useChat` + `addToolApprovalResponse()` | No built-in UI -- you build approval UI | No built-in UI -- you build approval UI |
| Async approval | Not built-in (assumes real-time UI) | Snapshot serializable for indefinite pause | Checkpointer persists interrupted state indefinitely |

#### Vercel AI SDK

```typescript
const deleteUser = tool({
  description: 'Delete a user account',
  inputSchema: z.object({ userId: z.string() }),
  needsApproval: true,
  execute: async ({ userId }) => { /* ... */ },
});

// Conditional approval
const processPayment = tool({
  description: 'Process a payment',
  inputSchema: z.object({ amount: z.number() }),
  needsApproval: async ({ amount }) => amount > 1000,
  execute: async ({ amount }) => { /* ... */ },
});
```

#### Mastra

```typescript
import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

const approvalStep = createStep({
  id: 'approval',
  inputSchema: z.object({ proposal: z.string() }),
  outputSchema: z.object({ approved: z.boolean() }),
  resumeSchema: z.object({ approved: z.boolean(), approver: z.string() }),
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!resumeData) {
      return suspend({ proposal: inputData.proposal });
    }
    return { approved: resumeData.approved };
  },
});

// Start workflow, then resume later with human input
const run = workflow.createRun();
await run.start({ inputData: { proposal: 'Budget increase' } });
// ... later ...
await run.resume({
  step: 'approval',
  resumeData: { approved: true, approver: 'Alice' },
});
```

#### LangChain/LangGraph

```typescript
import { interrupt, Command } from '@langchain/langgraph';

// Inside a graph node -- pause for human review
function reviewToolCalls(state: AgentState) {
  const lastMessage = state.messages.at(-1);
  const toolCalls = lastMessage?.tool_calls ?? [];

  // Interrupt -- graph pauses, state persisted via checkpointer
  const humanReview = interrupt({
    question: 'Approve these tool calls?',
    toolCalls,
  });

  if (humanReview.approved) {
    return new Command({ goto: 'execute_tools' });
  }
  return new Command({ goto: '__end__' });
}

// Resume from interrupt with human input
await graph.invoke(
  new Command({ resume: { approved: true, reviewer: 'Alice' } }),
  { configurable: { thread_id: 'conv-abc' } },
);
```

**Verdict: LangGraph wins for async patterns.** Its `interrupt()` + `Command`
system with checkpointer persistence is the most natural fit for durable
human-in-the-loop workflows. However, this overlaps heavily with the execution
runtime team's scope. AI SDK has better real-time web UI integration. Mastra's
suspend/resume is similarly capable but less mature.

---

### 7. Evals

| Capability | Vercel AI SDK | Mastra | LangChain/LangGraph |
|---|---|---|---|
| Built-in scorers | None | 12+: hallucination, faithfulness, toxicity, bias, relevancy, etc. | Via LangSmith (proprietary): correctness, helpfulness, custom criteria |
| Custom scorers | N/A | Four-step pipeline: preprocess -> analyze -> score -> reason | LangSmith custom evaluators + `RunEvalConfig` |
| CI integration | Vitest + manual LLM-as-judge | `runEvals()` with test cases, integrates with Vitest | LangSmith datasets + `evaluate()` API |
| Live evaluation | N/A | Scorers run alongside live agents with sampling | LangSmith online evaluation rules (proprietary) |

#### Vercel AI SDK

No built-in eval framework. Use test runners manually:

```typescript
import { describe, it, expect } from 'vitest';
import { generateText, Output } from 'ai';
import { z } from 'zod';

describe('Agent Evals', () => {
  it('should classify correctly', async () => {
    const { text } = await generateText({
      model: 'openai/gpt-4o',
      prompt: 'Classify: "My password reset email never arrived"',
    });
    expect(text).toContain('authentication');
  });

  // LLM-as-judge (you build the judge)
  it('should be helpful (LLM judge)', async () => {
    const { text: answer } = await generateText({ model, prompt: question });
    const { output: score } = await generateText({
      model,
      output: Output.object({
        schema: z.object({ helpfulness: z.number().min(1).max(10) }),
      }),
      prompt: `Rate helpfulness (1-10):\n${answer}`,
    });
    expect(score.helpfulness).toBeGreaterThanOrEqual(7);
  });
});
```

#### Mastra

```typescript
import { Agent } from '@mastra/core/agent';
import {
  createAnswerRelevancyScorer,
  createToxicityScorer,
  createHallucinationScorer,
} from '@mastra/evals/scorers';

// Live evaluation attached to agent
const agent = new Agent({
  name: 'evaluated-agent',
  model: 'openai/gpt-4o',
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: 'openai/gpt-4o-mini' }),
      sampling: { type: 'ratio', rate: 0.5 },
    },
    safety: {
      scorer: createToxicityScorer({ model: 'openai/gpt-4o-mini' }),
      sampling: { type: 'ratio', rate: 1 },
    },
  },
});

// Standalone scorer usage
const hallucination = createHallucinationScorer({ model: 'openai/gpt-4o-mini' });
const score = await hallucination.score({
  answer: 'Paris is the capital of Germany.',
  context: ['Paris is the capital of France'],
});
```

#### LangChain/LangGraph

Evals are primarily through LangSmith (proprietary cloud platform):

```typescript
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';

const client = new Client();

// Create a dataset for evaluation
const dataset = await client.createDataset('qa-dataset');
await client.createExamples({
  inputs: [{ question: 'What is RAG?' }],
  outputs: [{ answer: 'Retrieval-Augmented Generation...' }],
  datasetId: dataset.id,
});

// Run evaluation with custom evaluator
const results = await evaluate(
  async (input) => {
    const response = await agent.invoke({
      messages: [{ role: 'user', content: input.question }],
    });
    return { output: response.messages.at(-1)?.content };
  },
  {
    data: 'qa-dataset',
    evaluators: [
      // LLM-as-judge evaluator
      async ({ input, output, reference }) => ({
        key: 'correctness',
        score: /* LLM judge score */,
      }),
    ],
  },
);
```

**Verdict: Mastra wins for open-source evals.** Mastra ships 12+ production-ready
scorers as open-source packages with CI and live evaluation. LangChain's eval
story is powerful but tied to LangSmith (proprietary). AI SDK has no eval system.

---

### 8. Permissions / Guardrails

| Capability | Vercel AI SDK | Mastra | LangChain/LangGraph |
|---|---|---|---|
| Input validation | Zod schemas + `strict` mode | Zod schemas + input processors | Zod schemas + output parsers |
| Prompt injection | Middleware (you implement detection) | Built-in `PromptInjectionDetector` | Via third-party (LLM Guard, Guardrails AI) |
| PII detection | Not built-in | Built-in `PIIDetector` with redaction | Via third-party (LLM Guard, Presidio) |
| Content moderation | Not built-in | Built-in `ModerationProcessor` | Via third-party integration |
| Tool access control | `activeTools` per-request | Workspace per-tool enable/disable/approval | Graph-level `interrupt()` before tool nodes |
| Static analysis | `eslint-plugin-vercel-ai-security` | Not available | Not available |

#### Vercel AI SDK

Guardrails via language model middleware (you implement the detection logic):

```typescript
import { wrapLanguageModel } from 'ai';
import type { LanguageModelV3Middleware } from '@ai-sdk/provider';

const guardrail: LanguageModelV3Middleware = {
  transformParams: async ({ params }) => {
    const text = extractUserMessage(params.prompt);
    if (/ignore previous|system prompt/i.test(text)) {
      throw new Error('Prompt injection detected');
    }
    return params;
  },
  wrapGenerate: async ({ doGenerate }) => {
    const result = await doGenerate();
    result.text = result.text?.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]');
    return result;
  },
};

const guardedModel = wrapLanguageModel({ model, middleware: [guardrail] });
```

#### Mastra

Built-in processors with configurable strategies:

```typescript
import { Agent } from '@mastra/core/agent';
import {
  PromptInjectionDetector,
  PIIDetector,
  ModerationProcessor,
} from '@mastra/core/processors';

const agent = new Agent({
  name: 'secure-agent',
  model: 'openai/gpt-4o',
  inputProcessors: [
    new PromptInjectionDetector({
      model: 'openai/gpt-4o-mini',
      threshold: 0.8,
      strategy: 'rewrite', // 'block' | 'warn' | 'detect' | 'rewrite'
      detectionTypes: ['injection', 'jailbreak', 'system-override'],
    }),
    new PIIDetector({
      strategy: 'redact',
      detectionTypes: ['email', 'phone', 'credit-card'],
    }),
  ],
  outputProcessors: [
    new ModerationProcessor({ model: 'openai/gpt-4o-mini', strategy: 'block' }),
  ],
});
```

#### LangChain/LangGraph

LangChain provides middleware hooks (`beforeAgent`, `afterAgent`) for guardrails
but no built-in PII, injection, or moderation processors. Guardrails are
implemented via third-party integrations:

```typescript
import { StateGraph } from '@langchain/langgraph';

// Guardrails as graph nodes -- input validation before agent
function inputGuardrail(state: AgentState) {
  const lastMessage = state.messages.at(-1)?.content ?? '';

  // You implement detection logic or integrate third-party libraries
  if (detectPromptInjection(lastMessage)) {
    return { messages: [new AIMessage('Request blocked: suspicious input.')] };
  }
  return state;
}

const graph = new StateGraph(AgentState)
  .addNode('guardrail', inputGuardrail)
  .addNode('agent', agentNode)
  .addEdge('__start__', 'guardrail')
  .addConditionalEdges('guardrail', isBlocked, {
    blocked: '__end__',
    safe: 'agent',
  })
  .compile();
```

**Verdict: Mastra wins on runtime guardrails.** AI SDK wins on static analysis
(ESLint plugin). LangGraph provides the architectural pattern (guardrail nodes)
but no built-in detectors -- you wire third-party libraries yourself. For
production safety, Mastra's built-in processors are the most impactful.

---

## Summary Scorecard

| Dimension | Vercel AI SDK | Mastra | LangChain/LangGraph | Winner |
|---|---|---|---|---|
| **Memory/Context** | Primitives only | Three-tier + observational memory | Checkpointer + Store with semantic search | **Mastra** |
| **Tools** | Granular control, dynamic, repair | MCP server, workspace permissions | Largest integration ecosystem, MCP adapters | **Tie** |
| **Models** | 25+ providers, per-package install | 81 providers, zero-install, native fallback | 20+ providers, per-package install | **Mastra** |
| **Tracing** | OTel foundation, per-call opt-in | OTel + AI tracing, automatic, exporter packages | LangSmith (proprietary) + OTel, automatic | **Mastra / LangGraph tie** |
| **Orchestration** | Plain async patterns | Workflow engine + agent networks | StateGraph + supervisor + durable checkpointing | **LangGraph** |
| **Human in the Loop** | Real-time UI approval | Workflow suspend/resume | interrupt() + Command with checkpointed state | **LangGraph** |
| **Evals** | None built-in | 12+ scorers, CI + live eval | LangSmith evaluators (proprietary) | **Mastra** (open-source) |
| **Permissions** | Middleware hooks, ESLint plugin | Built-in processors (injection, PII, moderation) | Third-party integrations, graph-level guards | **Mastra** |

---

## Key Trade-offs

### Choose Vercel AI SDK alone if:
- Maximum control and minimal opinions are priorities
- The execution runtime team handles orchestration, memory, and durability
- You prefer building your own abstractions on proven primitives
- Largest ecosystem and community (8.3M weekly downloads)
- You want to avoid framework lock-in

### Choose Mastra if:
- Batteries-included for memory, evals, guardrails, and observability
- The orchestration overlap with the runtime team is manageable
- Moving fast on the AI layer without building every abstraction matters
- Eval system from day one is important
- The team behind Gatsby (YC W25) gives confidence in maintenance

### Choose LangChain/LangGraph if:
- Graph-based orchestration with durable execution is a primary requirement
- The team is comfortable with a heavier framework and graph-based mental model
- LangSmith (proprietary) is acceptable as the observability and eval platform
- Human-in-the-loop with persistent checkpointing is a day-one need
- The largest agent-specific ecosystem matters (supervisor patterns, pre-built agents)

### The hybrid option:
Since Mastra is built on the AI SDK, you can start with AI SDK primitives and
selectively adopt Mastra packages (`@mastra/memory`, `@mastra/evals`,
`@mastra/langfuse`) for capabilities you don't want to build yourself.

LangChain can also be used alongside AI SDK via the `@ai-sdk/langchain` adapter,
though mixing frameworks adds complexity.

---

## Risk Assessment

| Risk | AI SDK | Mastra | LangChain/LangGraph |
|---|---|---|---|
| **Vendor lock-in** | Low -- provider-agnostic | Medium -- Mastra-specific APIs | High -- LangSmith push, LangChain abstractions |
| **License** | Apache 2.0 | Apache 2.0 | MIT |
| **Community** | 8.3M npm/week, massive | 437k npm/week, growing fast | 1.8M npm/week (langchain) + 1.4M (langgraph) |
| **Maintenance** | Vercel-backed, flagship product | YC-backed, ex-Gatsby team | LangChain Inc., VC-backed, flagship product |
| **Overlap with runtime team** | None -- stays at primitives level | Workflow engine may conflict | StateGraph + checkpointer directly conflicts |
| **Migration cost** | Low -- standard patterns | Higher -- Mastra-specific abstractions | Highest -- graph-based architecture is pervasive |
| **Bundle size** | Minimal | Medium | Large (101 kB gzipped for langchain alone) |
| **API stability** | Stable (v6) | Unstable (14+ breaking changes v0→v1) | Stable (v1.0 GA) but frequent minor changes |

---

## n8n-Specific Considerations for LangChain/LangGraph

LangGraph was initially eliminated from the shortlist due to overlap with n8n's
execution runtime team. This section documents why that concern remains valid
and what unique value LangGraph would bring despite the overlap.

### Why LangGraph Overlaps with the Runtime Team

LangGraph's core value proposition -- `StateGraph` with checkpointed durable
execution -- is precisely what n8n's execution runtime team is building. Using
LangGraph for agent orchestration means:

1. **Two graph engines.** n8n's runtime executes workflow graphs; LangGraph
   executes agent graphs. Coordinating checkpointing, state persistence, and
   error recovery across two independent graph engines adds significant
   complexity.

2. **Two persistence models.** LangGraph's checkpointer manages its own state
   serialization. n8n's engine has its own. Bridging them requires a translation
   layer or accepting data duplication.

3. **Conflicting control flow.** LangGraph's `interrupt()`/`Command` system
   gives LangGraph control over execution flow. n8n's engine needs that same
   control for resource limits, credential injection, and workflow-level
   orchestration.

### What LangGraph Uniquely Offers

1. **Most mature agent orchestration.** Trusted by Klarna, Replit, Elastic.
   The supervisor pattern, graph-based routing, and checkpointed human-in-the-loop
   are battle-tested at scale.

2. **Graph-level checkpointing out of the box.** If the execution runtime
   team's work is delayed, LangGraph's checkpointer provides workflow-level
   durability without waiting for the engine. Note: this is checkpointing
   between graph nodes, not true durable execution (no automatic failure
   detection, no distributed coordination). Mastra's snapshot system provides
   comparable workflow-level durability.

3. **Strongest community for agent patterns.** The LangChain ecosystem has the
   most examples, tutorials, and pre-built patterns for complex agent architectures.

### Verdict for n8n

LangGraph is the most capable agent orchestration framework, but its strengths
are concentrated in areas that overlap with n8n's execution runtime. For n8n,
the orchestration layer should cooperate with the engine, not compete with it.
This makes LangGraph a poor fit as a runtime backend despite its technical
excellence.

If n8n did not have a separate execution runtime team, LangGraph would be the
strongest candidate.

---

## Open Questions

1. **How much does Mastra's workflow engine overlap with the execution runtime
   team's work?** If significant, the hybrid approach (AI SDK + selective Mastra
   packages) may be the right answer.
2. **Is the eval system a day-one requirement, or can it be added later?** If
   later, AI SDK's primitives-first approach has lower initial complexity.
3. **What's the team's comfort level with framework abstractions vs building
   from primitives?** AI SDK requires more upfront work; Mastra requires less but
   with more coupling.
4. **Is LangSmith acceptable as a proprietary dependency?** LangGraph's
   observability and eval story is strong but tied to a proprietary platform.
   If open-source observability is a requirement, LangGraph loses significant
   value.
5. **Could LangGraph's checkpointer be replaced with n8n's engine?** If the
   checkpointer interface is pluggable enough, LangGraph's orchestration could
   theoretically delegate durability to n8n's engine. This would require
   investigation into LangGraph's `BaseCheckpointSaver` interface.
