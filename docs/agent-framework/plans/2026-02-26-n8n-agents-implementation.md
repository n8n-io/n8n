# @n8n/agents Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the `@n8n/agents` package — a builder-pattern SDK backed by Mastra that lets users define and run AI agents in TypeScript.

**Architecture:** Thin facade over `@mastra/core`, `@mastra/memory`, and `@mastra/evals`. Public API exposes builder classes (Agent, Tool, Memory, Guardrail, Scorer, Network). Internally translates to Mastra calls. A `Run` object provides event-based engine cooperation. Nothing from `@mastra/*` is exported.

**Tech Stack:** TypeScript, Zod, `@mastra/core` ^1.6.0, `@mastra/memory` ^1.4.0, `@mastra/evals`, Jest for tests.

**Design doc:** `docs/agent-framework/plans/2026-02-25-n8n-agents-sdk-design.md`

---

### Task 1: Scaffold the package

Create the `@n8n/agents` package following the monorepo's `tsc` pattern (Pattern A from existing `@n8n/config`, `@n8n/di`).

**Files:**
- Create: `packages/@n8n/agents/package.json`
- Create: `packages/@n8n/agents/tsconfig.json`
- Create: `packages/@n8n/agents/tsconfig.build.json`
- Create: `packages/@n8n/agents/jest.config.js`
- Create: `packages/@n8n/agents/eslint.config.mjs`
- Create: `packages/@n8n/agents/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@n8n/agents",
  "version": "0.1.0",
  "description": "AI agent SDK for n8n's code-first execution engine",
  "main": "dist/index.js",
  "module": "src/index.ts",
  "types": "dist/index.d.ts",
  "files": ["dist/**/*"],
  "scripts": {
    "clean": "rimraf dist .turbo",
    "dev": "pnpm watch",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.build.json",
    "format": "biome format --write .",
    "format:check": "biome ci .",
    "lint": "eslint . --quiet",
    "lint:fix": "eslint . --fix",
    "watch": "tsc -p tsconfig.build.json --watch",
    "test": "jest",
    "test:unit": "jest",
    "test:dev": "jest --watch"
  },
  "dependencies": {
    "@mastra/core": "^1.6.0",
    "@mastra/memory": "^1.4.0",
    "@mastra/evals": "^1.0.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@n8n/typescript-config": "workspace:*"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "@n8n/typescript-config/tsconfig.common.json",
  "compilerOptions": {
    "rootDir": ".",
    "types": ["node", "jest"],
    "baseUrl": "src",
    "tsBuildInfoFile": "dist/typecheck.tsbuildinfo"
  },
  "include": ["src/**/*.ts"]
}
```

**Step 3: Create tsconfig.build.json**

```json
{
  "extends": ["./tsconfig.json", "@n8n/typescript-config/tsconfig.build.json"],
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/build.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/__tests__/**"]
}
```

**Step 4: Create jest.config.js**

```js
/** @type {import('jest').Config} */
module.exports = require('../../../jest.config');
```

**Step 5: Create eslint.config.mjs**

```js
import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(nodeConfig, {
  rules: {
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],
  },
});
```

**Step 6: Create src/index.ts with placeholder exports**

```typescript
export { Tool } from './tool';
export { Agent } from './agent';
export { Memory } from './memory';
export { Guardrail } from './guardrail';
export { Scorer } from './scorer';
export { Network } from './network';
export { configure } from './configure';
export type {
  BuiltTool,
  BuiltAgent,
  BuiltMemory,
  BuiltGuardrail,
  BuiltScorer,
  BuiltNetwork,
  Run,
  RunEvent,
  RunState,
  RunOptions,
  AgentResult,
  ToolContext,
} from './types';
```

**Step 7: Create src/types.ts with all public types**

This is the central type definitions file. All public types live here.

```typescript
import type { z } from 'zod';

// --- Run States ---

export type RunState =
  | 'running'
  | 'waiting_approval'
  | 'paused'
  | 'blocked'
  | 'completed'
  | 'failed';

// --- Run Events ---

export interface StepEvent {
  step: number;
  toolCalls: Array<{ tool: string; input: unknown }>;
  tokens: { input: number; output: number };
}

export interface ToolCallEvent {
  tool: string;
  input: unknown;
  output: unknown;
  duration: number;
}

export interface MessageEvent {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface StateChangeEvent {
  from: RunState;
  to: RunState;
  context: {
    approvalId?: string;
    pauseId?: string;
    reason?: string;
  };
}

export interface EvalEvent {
  scorer: string;
  score: number;
  reasoning: string;
}

export interface ErrorEvent {
  error: Error;
  step: number;
  recoverable: boolean;
}

export type RunEventMap = {
  step: StepEvent;
  toolCall: ToolCallEvent;
  message: MessageEvent;
  stateChange: StateChangeEvent;
  eval: EvalEvent;
  error: ErrorEvent;
};

export type RunEvent = keyof RunEventMap;

// --- Run Options ---

export interface RunOptions {
  resourceId?: string;
  threadId?: string;
}

// --- Agent Result ---

export interface AgentResult {
  text: string;
  toolCalls: Array<{ tool: string; input: unknown; output: unknown }>;
  tokens: { input: number; output: number };
  steps: number;
}

// --- Tool Context ---

export interface PauseOptions {
  reason: string;
  requestedInput?: z.ZodType;
}

export interface ToolContext {
  pause: (options: PauseOptions) => Promise<void>;
}

// --- Built types (opaque handles returned by .build()) ---

export interface BuiltTool {
  readonly name: string;
  readonly description: string;
  /** @internal */ readonly _mastraTool: unknown;
  /** @internal */ readonly _approval?: boolean | ((input: unknown) => boolean | Promise<boolean>);
}

export interface BuiltMemory {
  /** @internal */ readonly _mastraMemory: unknown;
}

export interface BuiltGuardrail {
  readonly name: string;
  readonly guardType: 'pii' | 'prompt-injection' | 'moderation' | 'custom';
  readonly strategy: 'block' | 'redact' | 'warn';
  /** @internal */ readonly _config: Record<string, unknown>;
}

export interface BuiltScorer {
  readonly name: string;
  readonly scorerType: string;
  readonly sampling: number;
  /** @internal */ readonly _mastraScorer: unknown;
}

export interface BuiltAgent {
  readonly name: string;
  run(prompt: string, options?: RunOptions): Run;
  stream(prompt: string, options?: RunOptions): Run;
  asTool(description: string): BuiltTool;
}

export interface BuiltNetwork {
  readonly name: string;
  run(prompt: string, options?: RunOptions): Run;
}

// --- Run Object ---

export interface Run {
  readonly state: RunState;
  readonly result: Promise<AgentResult>;
  on<E extends RunEvent>(event: E, handler: (data: RunEventMap[E]) => void): void;
  approve(approvalId: string): Promise<void>;
  deny(approvalId: string, reason?: string): Promise<void>;
  resume(pauseId: string, data: unknown): Promise<void>;
  abort(reason?: string): Promise<void>;
}

// --- Guardrail Types ---

export type GuardrailType = 'pii' | 'prompt-injection' | 'moderation' | 'custom';
export type GuardrailStrategy = 'block' | 'redact' | 'warn';
export type PiiDetectionType = 'email' | 'phone' | 'credit-card' | 'ssn' | 'address';

// --- Semantic Recall Config ---

export interface SemanticRecallConfig {
  topK: number;
  messageRange?: { before: number; after: number };
}
```

**Step 8: Install dependencies**

Run: `pnpm install` from repo root.

Expected: pnpm detects the new package and installs `@mastra/core`, `@mastra/memory`, `@mastra/evals`.

**Step 9: Verify build**

Run: `pushd packages/@n8n/agents && pnpm build > build.log 2>&1 && tail -5 build.log && popd`

Expected: Build will fail because the source files referenced in index.ts don't exist yet. That's fine — we'll create them in the next tasks.

**Step 10: Commit**

```bash
git add packages/@n8n/agents/
git commit -m "feat(agents): scaffold @n8n/agents package"
```

---

### Task 2: Tool builder

Implement the `Tool` builder class — the simplest primitive, no Mastra dependency needed for the builder itself.

**Files:**
- Create: `packages/@n8n/agents/src/tool.ts`
- Create: `packages/@n8n/agents/src/__tests__/tool.test.ts`

**Step 1: Write the tests**

```typescript
import { z } from 'zod';
import { Tool } from '../tool';

describe('Tool', () => {
  const inputSchema = z.object({ query: z.string() });
  const outputSchema = z.object({ result: z.string() });
  const handler = jest.fn(async ({ query }: { query: string }) => ({ result: `found: ${query}` }));

  afterEach(() => jest.clearAllMocks());

  it('should build a tool with all fields', () => {
    const tool = new Tool('search')
      .description('Search the web')
      .input(inputSchema)
      .output(outputSchema)
      .handler(handler)
      .build();

    expect(tool.name).toBe('search');
    expect(tool.description).toBe('Search the web');
  });

  it('should throw if name is missing', () => {
    expect(() => new Tool('').description('test').input(inputSchema).handler(handler).build())
      .toThrow('Tool name is required');
  });

  it('should throw if description is missing', () => {
    expect(() => new Tool('test').input(inputSchema).handler(handler).build())
      .toThrow('Tool "test" requires a description');
  });

  it('should throw if input schema is missing', () => {
    expect(() => new Tool('test').description('test').handler(handler).build())
      .toThrow('Tool "test" requires an input schema');
  });

  it('should throw if handler is missing', () => {
    expect(() => new Tool('test').description('test').input(inputSchema).build())
      .toThrow('Tool "test" requires a handler');
  });

  it('should build without output schema', () => {
    const tool = new Tool('test')
      .description('test')
      .input(inputSchema)
      .handler(handler)
      .build();

    expect(tool.name).toBe('test');
  });

  it('should support requiresApproval as boolean', () => {
    const tool = new Tool('dangerous')
      .description('Dangerous action')
      .input(inputSchema)
      .requiresApproval()
      .handler(handler)
      .build();

    expect(tool._approval).toBe(true);
  });

  it('should support requiresApproval as predicate', () => {
    const predicate = ({ query }: { query: string }) => query.includes('delete');
    const tool = new Tool('conditional')
      .description('Conditionally dangerous')
      .input(inputSchema)
      .requiresApproval(predicate)
      .handler(handler)
      .build();

    expect(typeof tool._approval).toBe('function');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=tool.test 2>&1 | tail -20 && popd`

Expected: FAIL — module `../tool` does not exist.

**Step 3: Implement Tool builder**

```typescript
import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import type { BuiltTool, ToolContext } from './types';

type AnyZodObject = z.ZodObject<z.ZodRawShape>;
type ApprovalPredicate<TInput> = (input: TInput) => boolean | Promise<boolean>;

export class Tool<TInput extends AnyZodObject = AnyZodObject, TOutput extends AnyZodObject = AnyZodObject> {
  private _name: string;
  private _description?: string;
  private _inputSchema?: TInput;
  private _outputSchema?: TOutput;
  private _handler?: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>;
  private _approval?: boolean | ApprovalPredicate<z.infer<TInput>>;

  constructor(name: string) {
    this._name = name;
  }

  description(desc: string): this {
    this._description = desc;
    return this;
  }

  input<T extends AnyZodObject>(schema: T): Tool<T, TOutput> {
    (this as unknown as Tool<T, TOutput>)._inputSchema = schema;
    return this as unknown as Tool<T, TOutput>;
  }

  output<T extends AnyZodObject>(schema: T): Tool<TInput, T> {
    (this as unknown as Tool<TInput, T>)._outputSchema = schema;
    return this as unknown as Tool<TInput, T>;
  }

  handler(fn: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>): this {
    this._handler = fn;
    return this;
  }

  requiresApproval(predicate?: ApprovalPredicate<z.infer<TInput>>): this {
    this._approval = predicate ?? true;
    return this;
  }

  build(): BuiltTool {
    if (!this._name) throw new Error('Tool name is required');
    if (!this._description) throw new Error(`Tool "${this._name}" requires a description`);
    if (!this._inputSchema) throw new Error(`Tool "${this._name}" requires an input schema`);
    if (!this._handler) throw new Error(`Tool "${this._name}" requires a handler`);

    const handler = this._handler;
    const mastraTool = createTool({
      id: this._name,
      description: this._description,
      inputSchema: this._inputSchema,
      outputSchema: this._outputSchema,
      execute: async ({ context: inputData }) => {
        const toolContext: ToolContext = {
          pause: async () => { throw new Error('Pause not yet implemented'); },
        };
        return await handler(inputData as z.infer<TInput>, toolContext);
      },
    });

    return {
      name: this._name,
      description: this._description,
      _mastraTool: mastraTool,
      _approval: this._approval,
    };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=tool.test 2>&1 | tail -20 && popd`

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add packages/@n8n/agents/src/tool.ts packages/@n8n/agents/src/__tests__/tool.test.ts
git commit -m "feat(agents): implement Tool builder"
```

---

### Task 3: Memory builder

Implement the `Memory` builder class.

**Files:**
- Create: `packages/@n8n/agents/src/memory.ts`
- Create: `packages/@n8n/agents/src/__tests__/memory.test.ts`

**Step 1: Write the tests**

```typescript
import { z } from 'zod';
import { Memory } from '../memory';

describe('Memory', () => {
  it('should build with lastMessages only', () => {
    const memory = new Memory().lastMessages(20).build();
    expect(memory).toBeDefined();
  });

  it('should build with semantic recall', () => {
    const memory = new Memory()
      .lastMessages(20)
      .semanticRecall({ topK: 4, messageRange: { before: 1, after: 1 } })
      .build();

    expect(memory).toBeDefined();
  });

  it('should build with working memory', () => {
    const schema = z.object({
      name: z.string().optional(),
      preferences: z.record(z.string()).optional(),
    });

    const memory = new Memory()
      .lastMessages(10)
      .workingMemory(schema)
      .build();

    expect(memory).toBeDefined();
  });

  it('should build with all options', () => {
    const memory = new Memory()
      .lastMessages(20)
      .semanticRecall({ topK: 4 })
      .workingMemory(z.object({ name: z.string().optional() }))
      .build();

    expect(memory).toBeDefined();
  });

  it('should default lastMessages to 10 if not set', () => {
    const memory = new Memory().build();
    expect(memory).toBeDefined();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=memory.test 2>&1 | tail -20 && popd`

Expected: FAIL.

**Step 3: Implement Memory builder**

```typescript
import { Memory as MastraMemory } from '@mastra/memory';
import type { z } from 'zod';
import type { BuiltMemory, SemanticRecallConfig } from './types';

type AnyZodObject = z.ZodObject<z.ZodRawShape>;

export class Memory {
  private _lastMessages = 10;
  private _semanticRecall?: SemanticRecallConfig;
  private _workingMemorySchema?: AnyZodObject;

  lastMessages(count: number): this {
    this._lastMessages = count;
    return this;
  }

  semanticRecall(config: SemanticRecallConfig): this {
    this._semanticRecall = config;
    return this;
  }

  workingMemory(schema: AnyZodObject): this {
    this._workingMemorySchema = schema;
    return this;
  }

  build(): BuiltMemory {
    const options: Record<string, unknown> = {
      lastMessages: this._lastMessages,
    };

    if (this._semanticRecall) {
      options.semanticRecall = this._semanticRecall;
    }

    if (this._workingMemorySchema) {
      options.workingMemory = {
        enabled: true,
        schema: this._workingMemorySchema,
      };
    }

    const mastraMemory = new MastraMemory({ options });

    return {
      _mastraMemory: mastraMemory,
    };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=memory.test 2>&1 | tail -20 && popd`

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add packages/@n8n/agents/src/memory.ts packages/@n8n/agents/src/__tests__/memory.test.ts
git commit -m "feat(agents): implement Memory builder"
```

---

### Task 4: Guardrail builder

Implement the `Guardrail` builder class.

**Files:**
- Create: `packages/@n8n/agents/src/guardrail.ts`
- Create: `packages/@n8n/agents/src/__tests__/guardrail.test.ts`

**Step 1: Write the tests**

```typescript
import { Guardrail } from '../guardrail';

describe('Guardrail', () => {
  it('should build a PII guardrail', () => {
    const guardrail = new Guardrail('pii-detector')
      .type('pii')
      .strategy('redact')
      .detect(['email', 'phone', 'credit-card'])
      .build();

    expect(guardrail.name).toBe('pii-detector');
    expect(guardrail.guardType).toBe('pii');
    expect(guardrail.strategy).toBe('redact');
  });

  it('should build a prompt injection guardrail', () => {
    const guardrail = new Guardrail('injection')
      .type('prompt-injection')
      .strategy('block')
      .threshold(0.8)
      .build();

    expect(guardrail.name).toBe('injection');
    expect(guardrail.guardType).toBe('prompt-injection');
    expect(guardrail.strategy).toBe('block');
  });

  it('should build a moderation guardrail', () => {
    const guardrail = new Guardrail('moderation')
      .type('moderation')
      .strategy('block')
      .build();

    expect(guardrail.name).toBe('moderation');
    expect(guardrail.guardType).toBe('moderation');
  });

  it('should throw if type is missing', () => {
    expect(() => new Guardrail('test').strategy('block').build())
      .toThrow('Guardrail "test" requires a type');
  });

  it('should throw if strategy is missing', () => {
    expect(() => new Guardrail('test').type('pii').build())
      .toThrow('Guardrail "test" requires a strategy');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=guardrail.test 2>&1 | tail -20 && popd`

**Step 3: Implement Guardrail builder**

```typescript
import type { BuiltGuardrail, GuardrailType, GuardrailStrategy, PiiDetectionType } from './types';

export class Guardrail {
  private _name: string;
  private _type?: GuardrailType;
  private _strategy?: GuardrailStrategy;
  private _detectionTypes?: PiiDetectionType[];
  private _threshold?: number;

  constructor(name: string) {
    this._name = name;
  }

  type(guardType: GuardrailType): this {
    this._type = guardType;
    return this;
  }

  strategy(strategy: GuardrailStrategy): this {
    this._strategy = strategy;
    return this;
  }

  detect(types: PiiDetectionType[]): this {
    this._detectionTypes = types;
    return this;
  }

  threshold(value: number): this {
    this._threshold = value;
    return this;
  }

  build(): BuiltGuardrail {
    if (!this._type) throw new Error(`Guardrail "${this._name}" requires a type`);
    if (!this._strategy) throw new Error(`Guardrail "${this._name}" requires a strategy`);

    return {
      name: this._name,
      guardType: this._type,
      strategy: this._strategy,
      _config: {
        detectionTypes: this._detectionTypes,
        threshold: this._threshold,
      },
    };
  }
}
```

**Step 4: Run tests, verify pass**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=guardrail.test 2>&1 | tail -20 && popd`

**Step 5: Commit**

```bash
git add packages/@n8n/agents/src/guardrail.ts packages/@n8n/agents/src/__tests__/guardrail.test.ts
git commit -m "feat(agents): implement Guardrail builder"
```

---

### Task 5: Scorer builder

**Files:**
- Create: `packages/@n8n/agents/src/scorer.ts`
- Create: `packages/@n8n/agents/src/__tests__/scorer.test.ts`

**Step 1: Write the tests**

```typescript
import { Scorer } from '../scorer';

describe('Scorer', () => {
  it('should build a scorer with all fields', () => {
    const scorer = new Scorer('relevancy')
      .type('answer-relevancy')
      .model('anthropic/claude-haiku-4-5')
      .sampling(0.5)
      .build();

    expect(scorer.name).toBe('relevancy');
    expect(scorer.scorerType).toBe('answer-relevancy');
    expect(scorer.sampling).toBe(0.5);
  });

  it('should default sampling to 1.0', () => {
    const scorer = new Scorer('toxicity')
      .type('toxicity')
      .model('anthropic/claude-haiku-4-5')
      .build();

    expect(scorer.sampling).toBe(1.0);
  });

  it('should throw if type is missing', () => {
    expect(() => new Scorer('test').model('openai/gpt-4o').build())
      .toThrow('Scorer "test" requires a type');
  });

  it('should throw if model is missing', () => {
    expect(() => new Scorer('test').type('toxicity').build())
      .toThrow('Scorer "test" requires a model');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=scorer.test 2>&1 | tail -20 && popd`

**Step 3: Implement Scorer builder**

```typescript
import type { BuiltScorer } from './types';

export class Scorer {
  private _name: string;
  private _type?: string;
  private _model?: string;
  private _sampling = 1.0;

  constructor(name: string) {
    this._name = name;
  }

  type(scorerType: string): this {
    this._type = scorerType;
    return this;
  }

  model(modelId: string): this {
    this._model = modelId;
    return this;
  }

  sampling(rate: number): this {
    this._sampling = rate;
    return this;
  }

  build(): BuiltScorer {
    if (!this._type) throw new Error(`Scorer "${this._name}" requires a type`);
    if (!this._model) throw new Error(`Scorer "${this._name}" requires a model`);

    return {
      name: this._name,
      scorerType: this._type,
      sampling: this._sampling,
      _mastraScorer: {
        type: this._type,
        model: this._model,
      },
    };
  }
}
```

**Step 4: Run tests, verify pass**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=scorer.test 2>&1 | tail -20 && popd`

**Step 5: Commit**

```bash
git add packages/@n8n/agents/src/scorer.ts packages/@n8n/agents/src/__tests__/scorer.test.ts
git commit -m "feat(agents): implement Scorer builder"
```

---

### Task 6: Run object (event emitter + state machine)

The `Run` object is the engine cooperation interface. It wraps agent execution and emits events.

**Files:**
- Create: `packages/@n8n/agents/src/run.ts`
- Create: `packages/@n8n/agents/src/__tests__/run.test.ts`

**Step 1: Write the tests**

```typescript
import { AgentRun } from '../run';

describe('AgentRun', () => {
  it('should start in running state', () => {
    const run = new AgentRun(Promise.resolve({ text: 'hi', toolCalls: [], tokens: { input: 0, output: 0 }, steps: 0 }));
    expect(run.state).toBe('running');
  });

  it('should transition to completed when result resolves', async () => {
    const run = new AgentRun(Promise.resolve({ text: 'done', toolCalls: [], tokens: { input: 10, output: 5 }, steps: 1 }));
    const result = await run.result;
    expect(result.text).toBe('done');
    expect(run.state).toBe('completed');
  });

  it('should transition to failed when result rejects', async () => {
    const run = new AgentRun(Promise.reject(new Error('boom')));
    await expect(run.result).rejects.toThrow('boom');
    expect(run.state).toBe('failed');
  });

  it('should emit stateChange events', async () => {
    const handler = jest.fn();
    const run = new AgentRun(Promise.resolve({ text: 'ok', toolCalls: [], tokens: { input: 0, output: 0 }, steps: 0 }));
    run.on('stateChange', handler);
    await run.result;
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ from: 'running', to: 'completed' }));
  });

  it('should emit step events', () => {
    const handler = jest.fn();
    const run = new AgentRun(new Promise(() => {}));
    run.on('step', handler);
    run.emitStep({ step: 1, toolCalls: [], tokens: { input: 10, output: 5 } });
    expect(handler).toHaveBeenCalledWith({ step: 1, toolCalls: [], tokens: { input: 10, output: 5 } });
  });

  it('should emit toolCall events', () => {
    const handler = jest.fn();
    const run = new AgentRun(new Promise(() => {}));
    run.on('toolCall', handler);
    run.emitToolCall({ tool: 'search', input: { q: 'test' }, output: { results: [] }, duration: 100 });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ tool: 'search' }));
  });

  it('should support abort', async () => {
    let rejectFn: (err: Error) => void;
    const promise = new Promise<never>((_, reject) => { rejectFn = reject; });
    const run = new AgentRun(promise);

    const stateHandler = jest.fn();
    run.on('stateChange', stateHandler);

    run.abort('user cancelled');
    // Simulate the abort causing the promise to reject
    rejectFn!(new Error('Aborted: user cancelled'));

    await expect(run.result).rejects.toThrow('Aborted');
    expect(run.state).toBe('failed');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=run.test 2>&1 | tail -20 && popd`

**Step 3: Implement the Run object**

```typescript
import type {
  AgentResult,
  RunState,
  RunEvent,
  RunEventMap,
  StepEvent,
  ToolCallEvent,
  MessageEvent,
  StateChangeEvent,
  EvalEvent,
  ErrorEvent,
} from './types';

type EventHandler<T> = (data: T) => void;

export class AgentRun {
  private _state: RunState = 'running';
  private _handlers = new Map<string, Array<EventHandler<unknown>>>();
  private _result: Promise<AgentResult>;
  private _abortReason?: string;

  constructor(resultPromise: Promise<AgentResult>) {
    this._result = resultPromise.then(
      (result) => {
        this.transition('completed');
        return result;
      },
      (error: unknown) => {
        this.transition('failed');
        throw error;
      },
    );
  }

  get state(): RunState {
    return this._state;
  }

  get result(): Promise<AgentResult> {
    return this._result;
  }

  on<E extends RunEvent>(event: E, handler: EventHandler<RunEventMap[E]>): void {
    const handlers = this._handlers.get(event) ?? [];
    handlers.push(handler as EventHandler<unknown>);
    this._handlers.set(event, handlers);
  }

  // --- Control methods (called by engine) ---

  async approve(_approvalId: string): Promise<void> {
    // Will be implemented when HITL is wired to Mastra
    this.transition('running');
  }

  async deny(_approvalId: string, _reason?: string): Promise<void> {
    this.transition('failed');
  }

  async resume(_pauseId: string, _data: unknown): Promise<void> {
    this.transition('running');
  }

  abort(reason?: string): void {
    this._abortReason = reason;
    this.transition('failed');
  }

  // --- Internal event emitters (called by runtime adapter) ---

  emitStep(data: StepEvent): void {
    this.emit('step', data);
  }

  emitToolCall(data: ToolCallEvent): void {
    this.emit('toolCall', data);
  }

  emitMessage(data: MessageEvent): void {
    this.emit('message', data);
  }

  emitEval(data: EvalEvent): void {
    this.emit('eval', data);
  }

  emitError(data: ErrorEvent): void {
    this.emit('error', data);
  }

  // --- Private ---

  private transition(to: RunState): void {
    if (this._state === to) return;
    const from = this._state;
    this._state = to;
    this.emit('stateChange', { from, to, context: { reason: this._abortReason } } satisfies StateChangeEvent);
  }

  private emit<E extends RunEvent>(event: E, data: RunEventMap[E]): void {
    const handlers = this._handlers.get(event) ?? [];
    for (const handler of handlers) {
      handler(data);
    }
  }
}
```

**Step 4: Run tests, verify pass**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=run.test 2>&1 | tail -20 && popd`

**Step 5: Commit**

```bash
git add packages/@n8n/agents/src/run.ts packages/@n8n/agents/src/__tests__/run.test.ts
git commit -m "feat(agents): implement Run object with events and state machine"
```

---

### Task 7: Mastra adapter (runtime bridge)

This is the internal layer that translates n8n builder types into Mastra API calls.

**Files:**
- Create: `packages/@n8n/agents/src/runtime/mastra-adapter.ts`
- Create: `packages/@n8n/agents/src/__tests__/mastra-adapter.test.ts`

**Step 1: Write the tests**

```typescript
import { MastraAdapter } from '../runtime/mastra-adapter';
import { Tool } from '../tool';
import { Memory } from '../memory';
import { z } from 'zod';

// We'll mock @mastra/core to avoid needing real LLM keys
jest.mock('@mastra/core/agent', () => ({
  Agent: jest.fn().mockImplementation((config: Record<string, unknown>) => ({
    name: config.name,
    generate: jest.fn().mockResolvedValue({ text: 'mock response' }),
    stream: jest.fn(),
    _config: config,
  })),
}));

describe('MastraAdapter', () => {
  it('should create a Mastra agent from n8n builder config', () => {
    const tool = new Tool('search')
      .description('Search')
      .input(z.object({ q: z.string() }))
      .handler(async ({ q }) => ({ result: q }))
      .build();

    const agent = MastraAdapter.createAgent({
      name: 'test-agent',
      model: 'openai/gpt-4o',
      instructions: 'Be helpful',
      tools: [tool],
    });

    expect(agent).toBeDefined();
    expect(agent.name).toBe('test-agent');
  });

  it('should create a Mastra agent with memory', () => {
    const memory = new Memory().lastMessages(20).build();

    const agent = MastraAdapter.createAgent({
      name: 'memory-agent',
      model: 'openai/gpt-4o',
      instructions: 'Remember things',
      tools: [],
      memory,
    });

    expect(agent).toBeDefined();
  });

  it('should throw if model is missing', () => {
    expect(() => MastraAdapter.createAgent({
      name: 'test',
      model: '',
      instructions: 'test',
      tools: [],
    })).toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=mastra-adapter.test 2>&1 | tail -20 && popd`

**Step 3: Implement the adapter**

```typescript
import { Agent as MastraAgent } from '@mastra/core/agent';
import type { BuiltTool, BuiltMemory } from '../types';

interface CreateAgentConfig {
  name: string;
  model: string;
  instructions: string;
  tools: BuiltTool[];
  memory?: BuiltMemory;
}

export class MastraAdapter {
  static createAgent(config: CreateAgentConfig): MastraAgent {
    if (!config.model) throw new Error(`Agent "${config.name}" requires a model`);

    const tools: Record<string, unknown> = {};
    for (const tool of config.tools) {
      tools[tool.name] = tool._mastraTool;
    }

    const agentConfig: Record<string, unknown> = {
      name: config.name,
      model: config.model,
      instructions: config.instructions,
      tools,
    };

    if (config.memory) {
      agentConfig.memory = config.memory._mastraMemory;
    }

    return new MastraAgent(agentConfig);
  }
}
```

**Step 4: Run tests, verify pass**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=mastra-adapter.test 2>&1 | tail -20 && popd`

**Step 5: Commit**

```bash
git add packages/@n8n/agents/src/runtime/mastra-adapter.ts packages/@n8n/agents/src/__tests__/mastra-adapter.test.ts
git commit -m "feat(agents): implement Mastra adapter layer"
```

---

### Task 8: Agent builder

The main `Agent` builder — ties everything together. Uses the Mastra adapter internally.

**Files:**
- Create: `packages/@n8n/agents/src/agent.ts`
- Create: `packages/@n8n/agents/src/__tests__/agent.test.ts`

**Step 1: Write the tests**

```typescript
import { z } from 'zod';
import { Agent } from '../agent';
import { Tool } from '../tool';
import { Memory } from '../memory';
import { Guardrail } from '../guardrail';
import { Scorer } from '../scorer';

// Mock Mastra to avoid needing real LLM keys
jest.mock('@mastra/core/agent', () => ({
  Agent: jest.fn().mockImplementation((config: Record<string, unknown>) => ({
    name: config.name,
    generate: jest.fn().mockResolvedValue({
      text: 'mock response',
      usage: { promptTokens: 10, completionTokens: 5 },
      steps: [{ toolCalls: [] }],
    }),
    stream: jest.fn(),
    _config: config,
  })),
}));

describe('Agent', () => {
  const searchTool = new Tool('search')
    .description('Search the web')
    .input(z.object({ query: z.string() }))
    .handler(async ({ query }) => ({ result: query }))
    .build();

  it('should build an agent with minimum config', () => {
    const agent = new Agent('test')
      .model('openai/gpt-4o')
      .instructions('Be helpful')
      .build();

    expect(agent.name).toBe('test');
  });

  it('should build an agent with tools', () => {
    const agent = new Agent('researcher')
      .model('openai/gpt-4o')
      .instructions('Research things')
      .tool(searchTool)
      .build();

    expect(agent.name).toBe('researcher');
  });

  it('should build an agent with memory', () => {
    const memory = new Memory().lastMessages(20).build();
    const agent = new Agent('assistant')
      .model('openai/gpt-4o')
      .instructions('Help me')
      .memory(memory)
      .build();

    expect(agent.name).toBe('assistant');
  });

  it('should build an agent with guardrails and scorers', () => {
    const guardrail = new Guardrail('injection')
      .type('prompt-injection')
      .strategy('block')
      .build();

    const scorer = new Scorer('relevancy')
      .type('answer-relevancy')
      .model('openai/gpt-4o-mini')
      .sampling(0.5)
      .build();

    const agent = new Agent('secure')
      .model('openai/gpt-4o')
      .instructions('Be safe')
      .inputGuardrail(guardrail)
      .scorer(scorer)
      .build();

    expect(agent.name).toBe('secure');
  });

  it('should throw if model is missing', () => {
    expect(() => new Agent('test').instructions('test').build())
      .toThrow('Agent "test" requires a model');
  });

  it('should throw if instructions are missing', () => {
    expect(() => new Agent('test').model('openai/gpt-4o').build())
      .toThrow('Agent "test" requires instructions');
  });

  it('should return a Run from .run()', () => {
    const agent = new Agent('test')
      .model('openai/gpt-4o')
      .instructions('Be helpful')
      .build();

    const run = agent.run('hello');
    expect(run.state).toBe('running');
    expect(run.result).toBeInstanceOf(Promise);
  });

  it('should convert to tool via .asTool()', () => {
    const agent = new Agent('specialist')
      .model('openai/gpt-4o')
      .instructions('Do specialized work')
      .build();

    const tool = agent.asTool('Delegate to specialist');
    expect(tool.name).toBe('specialist');
    expect(tool.description).toBe('Delegate to specialist');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=agent.test 2>&1 | tail -20 && popd`

**Step 3: Implement Agent builder**

```typescript
import type {
  BuiltAgent,
  BuiltTool,
  BuiltMemory,
  BuiltGuardrail,
  BuiltScorer,
  RunOptions,
  Run,
  AgentResult,
} from './types';
import { AgentRun } from './run';
import { MastraAdapter } from './runtime/mastra-adapter';

export class Agent {
  private _name: string;
  private _model?: string;
  private _instructions?: string;
  private _tools: BuiltTool[] = [];
  private _memory?: BuiltMemory;
  private _inputGuardrails: BuiltGuardrail[] = [];
  private _outputGuardrails: BuiltGuardrail[] = [];
  private _scorers: BuiltScorer[] = [];

  constructor(name: string) {
    this._name = name;
  }

  model(modelId: string): this {
    this._model = modelId;
    return this;
  }

  instructions(text: string): this {
    this._instructions = text;
    return this;
  }

  tool(builtTool: BuiltTool): this {
    this._tools.push(builtTool);
    return this;
  }

  memory(builtMemory: BuiltMemory): this {
    this._memory = builtMemory;
    return this;
  }

  inputGuardrail(guardrail: BuiltGuardrail): this {
    this._inputGuardrails.push(guardrail);
    return this;
  }

  outputGuardrail(guardrail: BuiltGuardrail): this {
    this._outputGuardrails.push(guardrail);
    return this;
  }

  scorer(builtScorer: BuiltScorer): this {
    this._scorers.push(builtScorer);
    return this;
  }

  build(): BuiltAgent {
    if (!this._model) throw new Error(`Agent "${this._name}" requires a model`);
    if (!this._instructions) throw new Error(`Agent "${this._name}" requires instructions`);

    const mastraAgent = MastraAdapter.createAgent({
      name: this._name,
      model: this._model,
      instructions: this._instructions,
      tools: this._tools,
      memory: this._memory,
    });

    const name = this._name;
    const inputGuardrails = this._inputGuardrails;
    const outputGuardrails = this._outputGuardrails;
    const scorers = this._scorers;

    const builtAgent: BuiltAgent = {
      name,

      run(prompt: string, options?: RunOptions): Run {
        const resultPromise = (async (): Promise<AgentResult> => {
          const generateOptions: Record<string, unknown> = {};

          if (options?.resourceId || options?.threadId) {
            generateOptions.memory = {
              resource: options.resourceId,
              thread: options.threadId,
            };
          }

          const response = await (mastraAgent as unknown as {
            generate: (prompt: string, opts?: Record<string, unknown>) => Promise<{
              text: string;
              usage?: { promptTokens: number; completionTokens: number };
              steps?: Array<{ toolCalls: Array<{ tool: string; input: unknown; output: unknown }> }>;
            }>;
          }).generate(prompt, generateOptions);

          return {
            text: response.text,
            toolCalls: response.steps?.flatMap(s => s.toolCalls) ?? [],
            tokens: {
              input: response.usage?.promptTokens ?? 0,
              output: response.usage?.completionTokens ?? 0,
            },
            steps: response.steps?.length ?? 0,
          };
        })();

        return new AgentRun(resultPromise);
      },

      stream(prompt: string, options?: RunOptions): Run {
        // Streaming will be fully wired in a follow-up task
        return builtAgent.run(prompt, options);
      },

      asTool(description: string): BuiltTool {
        return {
          name,
          description,
          _mastraTool: {
            type: 'agent-as-tool',
            agent: mastraAgent,
          },
        };
      },
    };

    return builtAgent;
  }
}
```

**Step 4: Run tests, verify pass**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=agent.test 2>&1 | tail -20 && popd`

**Step 5: Commit**

```bash
git add packages/@n8n/agents/src/agent.ts packages/@n8n/agents/src/__tests__/agent.test.ts
git commit -m "feat(agents): implement Agent builder with run, stream, and asTool"
```

---

### Task 9: Network builder

**Files:**
- Create: `packages/@n8n/agents/src/network.ts`
- Create: `packages/@n8n/agents/src/__tests__/network.test.ts`

**Step 1: Write the tests**

```typescript
import { z } from 'zod';
import { Network } from '../network';
import { Agent } from '../agent';
import { Tool } from '../tool';

jest.mock('@mastra/core/agent', () => ({
  Agent: jest.fn().mockImplementation((config: Record<string, unknown>) => ({
    name: config.name,
    generate: jest.fn().mockResolvedValue({
      text: 'mock response',
      usage: { promptTokens: 10, completionTokens: 5 },
      steps: [{ toolCalls: [] }],
    }),
    stream: jest.fn(),
    _config: config,
  })),
}));

describe('Network', () => {
  const researcher = new Agent('researcher')
    .model('openai/gpt-4o')
    .instructions('Research things')
    .build();

  const writer = new Agent('writer')
    .model('openai/gpt-4o')
    .instructions('Write things')
    .build();

  const coordinator = new Agent('coordinator')
    .model('openai/gpt-4o')
    .instructions('Coordinate tasks')
    .build();

  it('should build a network with coordinator and agents', () => {
    const network = new Network('team')
      .coordinator(coordinator)
      .agent(researcher)
      .agent(writer)
      .build();

    expect(network.name).toBe('team');
  });

  it('should throw if coordinator is missing', () => {
    expect(() => new Network('team').agent(researcher).build())
      .toThrow('Network "team" requires a coordinator');
  });

  it('should throw if no agents are added', () => {
    expect(() => new Network('team').coordinator(coordinator).build())
      .toThrow('Network "team" requires at least one agent');
  });

  it('should return a Run from .run()', () => {
    const network = new Network('team')
      .coordinator(coordinator)
      .agent(researcher)
      .agent(writer)
      .build();

    const run = network.run('Do research and write');
    expect(run.state).toBe('running');
    expect(run.result).toBeInstanceOf(Promise);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=network.test 2>&1 | tail -20 && popd`

**Step 3: Implement Network builder**

```typescript
import type { BuiltAgent, BuiltNetwork, RunOptions, Run, AgentResult } from './types';
import { AgentRun } from './run';

export class Network {
  private _name: string;
  private _coordinator?: BuiltAgent;
  private _agents: BuiltAgent[] = [];

  constructor(name: string) {
    this._name = name;
  }

  coordinator(agent: BuiltAgent): this {
    this._coordinator = agent;
    return this;
  }

  agent(builtAgent: BuiltAgent): this {
    this._agents.push(builtAgent);
    return this;
  }

  build(): BuiltNetwork {
    if (!this._coordinator) throw new Error(`Network "${this._name}" requires a coordinator`);
    if (this._agents.length === 0) throw new Error(`Network "${this._name}" requires at least one agent`);

    const coordinator = this._coordinator;
    const agents = this._agents;
    const name = this._name;

    // The network works by wrapping each agent as a tool on the coordinator.
    // This reuses the agent-as-tool pattern internally.
    const networkAgent = {
      ...coordinator,
      name,
    };

    // Build a coordinator-with-agent-tools by delegating to the coordinator's run
    // In the full implementation, this will use Mastra's agent network feature.
    // For now, we create a simple delegation pattern.

    return {
      name,

      run(prompt: string, options?: RunOptions): Run {
        const resultPromise = (async (): Promise<AgentResult> => {
          // Simple delegation: coordinator runs with agents available as context
          // Full Mastra network integration will replace this
          const coordinatorRun = coordinator.run(prompt, options);
          return await coordinatorRun.result;
        })();

        return new AgentRun(resultPromise);
      },
    };
  }
}
```

**Step 4: Run tests, verify pass**

Run: `pushd packages/@n8n/agents && pnpm test -- --testPathPattern=network.test 2>&1 | tail -20 && popd`

**Step 5: Commit**

```bash
git add packages/@n8n/agents/src/network.ts packages/@n8n/agents/src/__tests__/network.test.ts
git commit -m "feat(agents): implement Network builder"
```

---

### Task 10: Configure function + wire up index.ts

Add the global `configure()` function for engine-level settings (observability, storage) and make sure `src/index.ts` compiles.

**Files:**
- Create: `packages/@n8n/agents/src/configure.ts`
- Modify: `packages/@n8n/agents/src/index.ts`

**Step 1: Implement configure**

```typescript
interface AgentsConfig {
  tracing?: {
    exporter?: unknown;
  };
}

let globalConfig: AgentsConfig = {};

export function configure(config: AgentsConfig): void {
  globalConfig = { ...globalConfig, ...config };
}

export function getConfig(): AgentsConfig {
  return globalConfig;
}
```

**Step 2: Update index.ts to export everything**

Ensure all modules are correctly re-exported. Fix any import paths.

**Step 3: Build the package**

Run: `pushd packages/@n8n/agents && pnpm build > build.log 2>&1 && tail -10 build.log && popd`

Expected: Build succeeds with no errors.

**Step 4: Run all tests**

Run: `pushd packages/@n8n/agents && pnpm test 2>&1 | tail -30 && popd`

Expected: All tests pass.

**Step 5: Commit**

```bash
git add packages/@n8n/agents/src/
git commit -m "feat(agents): wire up index.ts exports and configure function"
```

---

### Task 11: PoC example script

Create a runnable example that demonstrates the full API. This is the PoC to show off.

**Files:**
- Create: `packages/@n8n/agents/examples/basic-agent.ts`

**Step 1: Write the example**

```typescript
/**
 * @n8n/agents PoC — Basic Agent Example
 *
 * This demonstrates the full builder API for creating and running an agent.
 * To run with real LLM calls, set OPENAI_API_KEY or ANTHROPIC_API_KEY.
 */
import { Agent, Tool, Memory, Guardrail, Scorer, Network } from '../src';
import { z } from 'zod';

// --- Tools ---

const searchTool = new Tool('web-search')
  .description('Search the web for information')
  .input(z.object({
    query: z.string().describe('The search query'),
    maxResults: z.number().default(3).describe('Maximum results to return'),
  }))
  .output(z.object({
    results: z.array(z.object({
      title: z.string(),
      snippet: z.string(),
    })),
  }))
  .handler(async ({ query, maxResults }) => {
    // Mock implementation for PoC
    return {
      results: Array.from({ length: maxResults }, (_, i) => ({
        title: `Result ${i + 1} for "${query}"`,
        snippet: `This is a mock search result about ${query}.`,
      })),
    };
  })
  .build();

const writeFileTool = new Tool('write-file')
  .description('Write content to a file')
  .input(z.object({
    path: z.string().describe('File path'),
    content: z.string().describe('File content'),
  }))
  .requiresApproval()
  .handler(async ({ path, content }) => {
    console.log(`[Mock] Would write to ${path}: ${content.slice(0, 50)}...`);
    return { written: true };
  })
  .build();

// --- Memory ---

const memory = new Memory()
  .lastMessages(20)
  .semanticRecall({ topK: 4, messageRange: { before: 1, after: 1 } })
  .build();

// --- Agents ---

const researcher = new Agent('researcher')
  .model('anthropic/claude-sonnet-4')
  .instructions('You are a research assistant. Search for information and return structured findings.')
  .tool(searchTool)
  .memory(memory)
  .inputGuardrail(
    new Guardrail('injection-detector')
      .type('prompt-injection')
      .strategy('block')
      .threshold(0.8)
      .build()
  )
  .scorer(
    new Scorer('relevancy')
      .type('answer-relevancy')
      .model('anthropic/claude-haiku-4-5')
      .sampling(0.5)
      .build()
  )
  .build();

const writer = new Agent('writer')
  .model('anthropic/claude-sonnet-4')
  .instructions('You write clear, engaging content based on research provided to you.')
  .tool(writeFileTool)
  .build();

// --- Multi-Agent: Agent as Tool ---

const orchestrator = new Agent('orchestrator')
  .model('anthropic/claude-sonnet-4')
  .instructions('You coordinate research and writing. Delegate research to the researcher and writing to the writer.')
  .tool(researcher.asTool('Delegate research tasks to the research specialist'))
  .tool(writer.asTool('Delegate writing tasks to the writer'))
  .build();

// --- Multi-Agent: Network ---

const team = new Network('content-team')
  .coordinator(
    new Agent('coordinator')
      .model('anthropic/claude-sonnet-4')
      .instructions('Route tasks to the right specialist on the team.')
      .build()
  )
  .agent(researcher)
  .agent(writer)
  .build();

// --- Run ---

async function main() {
  console.log('=== @n8n/agents PoC ===\n');

  // Single agent run
  console.log('1. Single agent run:');
  const run = researcher.run('Find information about RAG architectures', {
    resourceId: 'user-123',
    threadId: 'session-1',
  });

  // Engine observes via events (automatic, not user-configured)
  run.on('stateChange', ({ from, to }) => {
    console.log(`   State: ${from} -> ${to}`);
  });

  run.on('step', ({ step, tokens }) => {
    console.log(`   Step ${step}: ${tokens.input + tokens.output} tokens`);
  });

  const result = await run.result;
  console.log(`   Result: ${result.text.slice(0, 100)}...`);
  console.log(`   Tokens: ${result.tokens.input} in, ${result.tokens.output} out`);

  // Agent as tool
  console.log('\n2. Orchestrator (agent-as-tool):');
  const orchRun = orchestrator.run('Research RAG architectures and write a summary');
  const orchResult = await orchRun.result;
  console.log(`   Result: ${orchResult.text.slice(0, 100)}...`);

  // Network
  console.log('\n3. Network run:');
  const teamRun = team.run('Research and write about vector databases');
  const teamResult = await teamRun.result;
  console.log(`   Result: ${teamResult.text.slice(0, 100)}...`);

  console.log('\n=== Done ===');
}

main().catch(console.error);
```

**Step 2: Commit**

```bash
git add packages/@n8n/agents/examples/
git commit -m "feat(agents): add PoC example demonstrating full builder API"
```

---

## Summary

| Task | What it builds | Key files |
|------|---------------|-----------|
| 1 | Package scaffold | package.json, tsconfig, eslint |
| 2 | Tool builder | tool.ts + tests |
| 3 | Memory builder | memory.ts + tests |
| 4 | Guardrail builder | guardrail.ts + tests |
| 5 | Scorer builder | scorer.ts + tests |
| 6 | Run object | run.ts + tests |
| 7 | Mastra adapter | runtime/mastra-adapter.ts + tests |
| 8 | Agent builder | agent.ts + tests |
| 9 | Network builder | network.ts + tests |
| 10 | Configure + index wiring | configure.ts, index.ts |
| 11 | PoC example | examples/basic-agent.ts |

After Task 11, you'll have a compilable package with a demonstrable PoC showing the full builder API: tools, agents, memory, guardrails, scorers, multi-agent patterns, the Run event system, and the network coordinator.
