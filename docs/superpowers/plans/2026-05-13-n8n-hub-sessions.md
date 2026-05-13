# n8n Hub — Sessions & Node-Direct Execution View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional `caller.sessionId` to single-node executions, group them in the executions list under collapsible session blocks, and replace the canvas-first detail view with a node-direct view that includes a session sibling rail.

**Architecture:** Caller-supplied session id rides on the existing `ExecutionMetadata` payload — no schema change. Each official caller (CLI, MCP, SDK) generates a sensible default. UI gets a per-user "Group by session" toggle, a new `ExecutionsSessionGroup.vue` for grouped rendering, and a `SingleNodeExecutionDetail.vue` that replaces `<WorkflowPreview>` for `mode === 'single-node'`. All chrome uses `@n8n/design-system` primitives (`N8nSwitch`, `N8nBadge`, `N8nTag`, `N8nIcon`).

**Tech Stack:** TypeScript, Zod, Express, Node.js, Vue 3, Pinia, `@n8n/design-system`, `@n8n/i18n`, Jest (backend), Vitest (frontend).

**Spec:** `docs/superpowers/specs/2026-05-13-n8n-hub-sessions-design.md` (commit `5221f47861`).

---

## Phase 1 — Schema & backend

### Task 1: Add `sessionId` to `ExecutionCallerSchema`

**Files:**
- Modify: `packages/@n8n/api-types/src/schemas/executions.schema.ts`
- Test: `packages/@n8n/api-types/src/schemas/__tests__/executions.schema.test.ts`

- [ ] **Step 1: Add the failing schema test**

Add inside the existing `describe('ExecutionCallerSchema', …)` in `executions.schema.test.ts`:

```ts
it('accepts a caller with sessionId', () => {
  const parsed = ExecutionCallerSchema.parse({
    kind: 'mcp',
    name: 'mcp-server',
    sessionId: 'a3f24c-session',
  });
  expect(parsed).toEqual({ kind: 'mcp', name: 'mcp-server', sessionId: 'a3f24c-session' });
});

it('rejects an empty sessionId', () => {
  expect(() =>
    ExecutionCallerSchema.parse({ kind: 'cli', name: 'n8n-cli', sessionId: '' }),
  ).toThrow();
});

it('rejects a sessionId longer than 512 chars', () => {
  expect(() =>
    ExecutionCallerSchema.parse({ kind: 'cli', name: 'n8n-cli', sessionId: 'x'.repeat(513) }),
  ).toThrow();
});
```

Add inside `describe('extractExecutionCaller', …)`:

```ts
it('includes sessionId when present', () => {
  expect(
    extractExecutionCaller({
      [EXECUTION_CALLER_METADATA_KEYS.kind]: 'mcp',
      [EXECUTION_CALLER_METADATA_KEYS.name]: 'mcp-server',
      [EXECUTION_CALLER_METADATA_KEYS.sessionId]: 'a3f24c-session',
    }),
  ).toEqual({ kind: 'mcp', name: 'mcp-server', sessionId: 'a3f24c-session' });
});

it('omits sessionId when absent', () => {
  expect(
    extractExecutionCaller({
      [EXECUTION_CALLER_METADATA_KEYS.kind]: 'cli',
      [EXECUTION_CALLER_METADATA_KEYS.name]: 'n8n-cli@host',
    }),
  ).toEqual({ kind: 'cli', name: 'n8n-cli@host' });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pushd packages/@n8n/api-types && pnpm test -- executions.schema.test.ts 2>&1 | tail -30; popd
```

Expected: the new tests fail (`sessionId` field doesn't exist, metadata key not defined).

- [ ] **Step 3: Extend the schema**

In `packages/@n8n/api-types/src/schemas/executions.schema.ts`:

```ts
export const ExecutionCallerSchema = z.object({
  kind: ExecutionCallerKindSchema,
  name: z.string(),
  clientId: z.string().optional(),
  sessionId: z.string().min(1).max(512).optional(),
});
```

Add the metadata key to `EXECUTION_CALLER_METADATA_KEYS`:

```ts
export const EXECUTION_CALLER_METADATA_KEYS = {
  kind: 'caller.kind',
  name: 'caller.name',
  clientId: 'caller.clientId',
  sessionId: 'caller.sessionId',
  nodeType: 'nodeType',
  actionId: 'actionId',
  actionDisplayName: 'actionDisplayName',
  credentialId: 'credentialId',
} as const;
```

Extend `extractExecutionCaller`:

```ts
export function extractExecutionCaller(
  metadata: Record<string, string> | undefined,
): ExecutionCaller | undefined {
  if (!metadata) return undefined;

  const kindRaw = metadata[EXECUTION_CALLER_METADATA_KEYS.kind];
  const name = metadata[EXECUTION_CALLER_METADATA_KEYS.name];
  if (!kindRaw || !name) return undefined;

  const kind = ExecutionCallerKindSchema.safeParse(kindRaw);
  if (!kind.success) return undefined;

  const clientId = metadata[EXECUTION_CALLER_METADATA_KEYS.clientId];
  const sessionId = metadata[EXECUTION_CALLER_METADATA_KEYS.sessionId];

  return {
    kind: kind.data,
    name,
    ...(clientId !== undefined ? { clientId } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
  };
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pushd packages/@n8n/api-types && pnpm test -- executions.schema.test.ts 2>&1 | tail -30; popd
```

Expected: all tests pass.

- [ ] **Step 5: Run typecheck + lint**

```bash
pushd packages/@n8n/api-types && pnpm typecheck && pnpm lint 2>&1 | tail -20; popd
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/api-types/src/schemas/executions.schema.ts \
        packages/@n8n/api-types/src/schemas/__tests__/executions.schema.test.ts
git commit -m "feat(@n8n/api-types): add caller.sessionId to execution caller schema"
```

---

### Task 2: Add `sessionId` to `ExecuteNodeRequestDto`

**Files:**
- Modify: `packages/cli/src/executions/dto/execute-node-request.dto.ts`

- [ ] **Step 1: Update the DTO**

Replace the `caller` object definition in `packages/cli/src/executions/dto/execute-node-request.dto.ts`:

```ts
import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class ExecuteNodeRequestDto extends Z.class({
  nodeType: z.string().min(1),
  nodeVersion: z.number().optional(),
  parameters: z.record(z.unknown()).default({}),
  credentialId: z.string().optional(),
  dryRun: z.boolean().optional(),
  caller: z
    .object({
      kind: z.enum(['mcp', 'sdk', 'cli']),
      name: z.string(),
      clientId: z.string().optional(),
      sessionId: z.string().min(1).max(512).optional(),
    })
    .optional(),
}) {}
```

- [ ] **Step 2: Run typecheck**

```bash
pushd packages/cli && pnpm typecheck 2>&1 | tail -20; popd
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/executions/dto/execute-node-request.dto.ts
git commit -m "feat(@n8n/cli): accept caller.sessionId on POST /executions/node"
```

---

### Task 3: Persist `caller.sessionId` in `ExecuteNodeService`

**Files:**
- Modify: `packages/cli/src/executions/execute-node.service.ts:511-517`
- Test: `packages/cli/src/executions/__tests__/execute-node.service.test.ts`

- [ ] **Step 1: Add the failing test**

Add inside the `describe('caller metadata persistence', …)` block (find it via search for `writes caller metadata after execution completes` around line 229):

```ts
it('persists caller.sessionId when present', async () => {
  await service.execute({
    user: mockUser,
    nodeType: 'n8n-nodes-base.set',
    parameters: { values: {} },
    caller: {
      kind: 'mcp',
      name: 'mcp-server',
      clientId: 'abc',
      sessionId: 'session-xyz',
    },
  });

  expect(executionMetadataService.save).toHaveBeenCalledWith(
    'exec-42',
    expect.objectContaining({
      'caller.sessionId': 'session-xyz',
    }),
  );
});

it('omits caller.sessionId when absent', async () => {
  await service.execute({
    user: mockUser,
    nodeType: 'n8n-nodes-base.set',
    parameters: { values: {} },
    caller: { kind: 'cli', name: 'n8n-cli' },
  });

  const callArg = executionMetadataService.save.mock.calls[0][1];
  expect(callArg).not.toHaveProperty('caller.sessionId');
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pushd packages/cli && pnpm test -- execute-node.service.test.ts 2>&1 | tail -30; popd
```

Expected: the new tests fail (sessionId not persisted).

- [ ] **Step 3: Add the persistence branch**

In `packages/cli/src/executions/execute-node.service.ts`, inside `persistCallerMetadata` (around line 511), extend the existing `req.caller` block:

```ts
if (req.caller) {
  metadata[EXECUTION_CALLER_METADATA_KEYS.kind] = req.caller.kind;
  metadata[EXECUTION_CALLER_METADATA_KEYS.name] = req.caller.name;
  if (req.caller.clientId !== undefined) {
    metadata[EXECUTION_CALLER_METADATA_KEYS.clientId] = req.caller.clientId;
  }
  if (req.caller.sessionId !== undefined) {
    metadata[EXECUTION_CALLER_METADATA_KEYS.sessionId] = req.caller.sessionId;
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pushd packages/cli && pnpm test -- execute-node.service.test.ts 2>&1 | tail -30; popd
```

Expected: all tests pass.

- [ ] **Step 5: Run typecheck**

```bash
pushd packages/cli && pnpm typecheck 2>&1 | tail -10; popd
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/executions/execute-node.service.ts \
        packages/cli/src/executions/__tests__/execute-node.service.test.ts
git commit -m "feat(cli): persist caller.sessionId on single-node executions"
```

---

## Phase 2 — Callers (CLI, MCP, SDK)

### Task 4: CLI — accept `sessionId` in the client

**Files:**
- Modify: `packages/@n8n/cli/src/client.ts:477-486`
- Test: `packages/@n8n/cli/src/__tests__/client.test.ts`

- [ ] **Step 1: Add the failing client test**

In `packages/@n8n/cli/src/__tests__/client.test.ts`, add a test that asserts the client forwards `caller.sessionId` to the POST body. Match the pattern of any existing `executeNode` test in this file (use the existing mocks/setup).

```ts
it('forwards caller.sessionId to POST /executions/node', async () => {
  // Arrange: existing test scaffolding for the client + mocked fetch
  // (mirror the closest existing test for executeNode in this file)
  await client.executeNode({
    nodeType: 'n8n-nodes-base.set',
    caller: { kind: 'cli', name: 'n8n-cli', sessionId: 'cli-session-42' },
  });

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/executions/node'),
    expect.objectContaining({
      body: expect.stringContaining('"sessionId":"cli-session-42"'),
    }),
  );
});
```

Note: read the existing `client.test.ts` and copy its setup verbatim. The above only shows the assertion shape.

- [ ] **Step 2: Run test to verify failure**

```bash
pushd packages/@n8n/cli && pnpm test -- client.test.ts 2>&1 | tail -20; popd
```

Expected: test fails because the type narrows `caller` to omit `sessionId`.

- [ ] **Step 3: Widen the caller type on the client**

In `packages/@n8n/cli/src/client.ts`, update `executeNode`:

```ts
async executeNode(body: {
  nodeType: string;
  nodeVersion?: number;
  parameters?: Record<string, unknown>;
  credentialId?: string;
  dryRun?: boolean;
  caller?: {
    kind: 'mcp' | 'sdk' | 'cli';
    name: string;
    clientId?: string;
    sessionId?: string;
  };
}) {
  return await this.postRest<Record<string, unknown>>('/executions/node', body);
}
```

- [ ] **Step 4: Run tests + typecheck**

```bash
pushd packages/@n8n/cli && pnpm test -- client.test.ts && pnpm typecheck 2>&1 | tail -20; popd
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/@n8n/cli/src/client.ts packages/@n8n/cli/src/__tests__/client.test.ts
git commit -m "feat(@n8n/cli): forward caller.sessionId to /executions/node"
```

---

### Task 5: CLI — default per-invocation `sessionId` + `--session` flag

**Files:**
- Modify: `packages/@n8n/cli/src/commands/exec/run.ts`
- Test: `packages/@n8n/cli/src/__tests__/commands/node-and-exec.test.ts`

- [ ] **Step 1: Add the failing command test**

In `node-and-exec.test.ts` (the existing exec-related test file), add tests that:

1. When no `--session` is passed, the request body contains a non-empty `caller.sessionId`.
2. When `--session=my-session` is passed, the request body contains exactly that value.

Use the existing mock-client pattern in this file (the same mock used by other tests). Inspect captured request body.

```ts
it('attaches a default sessionId per invocation', async () => {
  await runCommand(['exec', 'run', 'set.json', '--param', 'mode=raw']);
  const body = mockClient.executeNode.mock.calls[0][0];
  expect(body.caller.sessionId).toEqual(expect.stringMatching(/^[a-f0-9-]{8,}/));
});

it('uses --session value when provided', async () => {
  await runCommand(['exec', 'run', 'set.json', '--param', 'mode=raw', '--session', 'fixed']);
  const body = mockClient.executeNode.mock.calls[0][0];
  expect(body.caller.sessionId).toBe('fixed');
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pushd packages/@n8n/cli && pnpm test -- node-and-exec.test.ts 2>&1 | tail -30; popd
```

Expected: tests fail.

- [ ] **Step 3: Generate session id + add flag**

In `packages/@n8n/cli/src/commands/exec/run.ts`:

```ts
import { Args, Flags } from '@oclif/core';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
// ...existing imports
```

Add the flag in the static `flags` block:

```ts
session: Flags.string({
  description:
    'Session id to attribute this call to. Defaults to a per-invocation uuid so multi-step scripts group together.',
}),
```

Update the `executeNode` call site to attach `sessionId`:

```ts
const sessionId = flags.session ?? randomUUID();

const response = (await client.executeNode({
  nodeType,
  parameters,
  ...(flags.credential ? { credentialId: flags.credential } : {}),
  ...(flags.dryRun ? { dryRun: true } : {}),
  caller: { kind: 'cli', name: 'n8n-cli', sessionId },
})) as ExecuteNodeResponse;
```

- [ ] **Step 4: Run tests + typecheck + lint**

```bash
pushd packages/@n8n/cli && pnpm test && pnpm typecheck && pnpm lint 2>&1 | tail -30; popd
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/@n8n/cli/src/commands/exec/run.ts \
        packages/@n8n/cli/src/__tests__/commands/node-and-exec.test.ts
git commit -m "feat(@n8n/cli): default per-invocation session id with --session override"
```

---

### Task 6: MCP — accept `sessionId` in tool input + transport default

**Files:**
- Modify: `packages/cli/src/modules/mcp/tools/n8n-execute-tool.tool.ts`
- Test: `packages/cli/src/modules/mcp/__tests__/n8n-execute-tool.tool.test.ts`

- [ ] **Step 1: Add the failing tool tests**

In `packages/cli/src/modules/mcp/__tests__/n8n-execute-tool.tool.test.ts`, add cases that:

1. When the tool handler is called with `sessionId` in the input, it propagates to `executeNodeService.execute({ caller: { ..., sessionId } })`.
2. When `sessionId` is absent, the caller is dispatched without `sessionId` (transport-supplied default is added by the MCP server middleware in a later task, so for the unit-test scope, absence simply means "no override").

Match the existing test setup in this file (mock `ExecuteNodeService` and assert the args).

```ts
it('forwards sessionId from tool input to executeNodeService', async () => {
  const tool = createN8nExecuteToolTool(user, executeNodeService, nodeCatalogService, telemetry);
  await tool.handler({
    id: 'set.json',
    params: { mode: 'raw' },
    sessionId: 'agent-conv-123',
  });
  expect(executeNodeService.execute).toHaveBeenCalledWith(
    expect.objectContaining({
      caller: expect.objectContaining({
        kind: 'mcp',
        name: 'mcp-server',
        sessionId: 'agent-conv-123',
      }),
    }),
  );
});

it('omits sessionId when not provided in input', async () => {
  const tool = createN8nExecuteToolTool(user, executeNodeService, nodeCatalogService, telemetry);
  await tool.handler({ id: 'set.json', params: { mode: 'raw' } });
  const arg = executeNodeService.execute.mock.calls[0][0];
  expect(arg.caller.sessionId).toBeUndefined();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pushd packages/cli && pnpm test -- n8n-execute-tool.tool.test.ts 2>&1 | tail -30; popd
```

Expected: fail (sessionId not in input schema, not propagated).

- [ ] **Step 3: Add sessionId to input schema and handler**

In `packages/cli/src/modules/mcp/tools/n8n-execute-tool.tool.ts`, extend `inputSchema`:

```ts
const inputSchema = {
  id: z.string().min(1).describe('Operation identifier: ...'), // unchanged
  credentialId: z.string().optional().describe('Optional id of the credential to bind to the node.'),
  params: z.record(z.unknown()).describe('Parameters for the node operation. ...'),
  dryRun: z.boolean().optional().describe('When true, ...'),
  sessionId: z
    .string()
    .min(1)
    .max(512)
    .optional()
    .describe(
      'Optional logical session identifier. Pass the same value across multiple tool calls that belong to one agent run / conversation so n8n can group them in its executions list.',
    ),
} satisfies z.ZodRawShape;
```

Update the handler's `executeNodeService.execute` call:

```ts
const { id, credentialId, params, dryRun, sessionId } = input;
// ...
const result: ExecuteNodeResult = await executeNodeService.execute({
  user,
  nodeType,
  parameters,
  ...(credentialId ? { credentialId } : {}),
  ...(dryRun ? { dryRun } : {}),
  caller: {
    kind: 'mcp',
    name: 'mcp-server',
    ...(sessionId ? { sessionId } : {}),
  },
});
```

- [ ] **Step 4: Run tests + typecheck**

```bash
pushd packages/cli && pnpm test -- n8n-execute-tool.tool.test.ts && pnpm typecheck 2>&1 | tail -20; popd
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/modules/mcp/tools/n8n-execute-tool.tool.ts \
        packages/cli/src/modules/mcp/__tests__/n8n-execute-tool.tool.test.ts
git commit -m "feat(cli): MCP n8n_execute_tool accepts optional sessionId"
```

---

### Task 7: SDK — default per-client `sessionId` + per-call override

**Files:**
- Modify: `packages/@n8n/sdk/src/proxy.ts:19-23` (interface) and `217-230` (createProxy)
- Test: `packages/@n8n/sdk/src/__tests__/proxy.test.ts`

- [ ] **Step 1: Add the failing proxy tests**

In `packages/@n8n/sdk/src/__tests__/proxy.test.ts`, add:

```ts
it('attaches a default sessionId to every request from one client', async () => {
  const fetchMock = mockFetch();
  const n8n = createProxy({ baseUrl: 'https://hub.test', token: 't' });

  await n8n.set.json({ mode: 'raw' });
  await n8n.set.json({ mode: 'expression' });

  const body1 = JSON.parse(fetchMock.mock.calls[0][1].body as string);
  const body2 = JSON.parse(fetchMock.mock.calls[1][1].body as string);

  expect(body1.caller.sessionId).toEqual(expect.stringMatching(/^[a-f0-9-]{8,}/));
  expect(body2.caller.sessionId).toBe(body1.caller.sessionId);
});

it('uses caller.sessionId override when provided at createProxy', async () => {
  const fetchMock = mockFetch();
  const n8n = createProxy({
    baseUrl: 'https://hub.test',
    token: 't',
    caller: { kind: 'sdk', name: 'my-app', sessionId: 'fixed-session' },
  });

  await n8n.set.json({});
  const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
  expect(body.caller.sessionId).toBe('fixed-session');
});

it('allows per-call caller override to win over the client default', async () => {
  const fetchMock = mockFetch();
  const n8n = createProxy({ baseUrl: 'https://hub.test', token: 't' });

  await n8n.set.json({
    caller: { kind: 'sdk', name: '@n8n/sdk', sessionId: 'per-call' },
  });

  const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
  expect(body.caller.sessionId).toBe('per-call');
});
```

Use the existing `mockFetch` helper / setup pattern from `proxy.test.ts`. The above is the assertion shape only.

- [ ] **Step 2: Run tests to verify failure**

```bash
pushd packages/@n8n/sdk && pnpm test -- proxy.test.ts 2>&1 | tail -30; popd
```

Expected: tests fail.

- [ ] **Step 3: Extend `ExecutionCaller` interface and add default-session generation**

In `packages/@n8n/sdk/src/proxy.ts`:

```ts
import { randomUUID } from 'node:crypto';

export interface ExecutionCaller {
  kind: 'mcp' | 'sdk' | 'cli';
  name: string;
  clientId?: string;
  sessionId?: string;
}
```

Update `createProxy` so a per-client default sessionId is generated when the caller doesn't supply one:

```ts
export function createProxy(options: CreateProxyOptions): N8nClient {
  const { baseUrl, token, caller } = options;
  const defaultCaller: ExecutionCaller = caller ?? { kind: 'sdk', name: '@n8n/sdk' };
  const effectiveCaller: ExecutionCaller = {
    ...defaultCaller,
    sessionId: defaultCaller.sessionId ?? randomUUID(),
  };
  const root: Record<string, unknown> = {};

  return new Proxy(root, {
    get(target, service: string | symbol, receiver) {
      if (isReservedKey(service)) {
        return Reflect.get(target, service, receiver) as unknown;
      }
      return makeL2(service, baseUrl, token, effectiveCaller);
    },
  });
}
```

Drop the standalone `DEFAULT_CALLER` constant — it's now inlined into the default branch.

- [ ] **Step 4: Run tests + typecheck**

```bash
pushd packages/@n8n/sdk && pnpm test && pnpm typecheck 2>&1 | tail -20; popd
```

Expected: pass.

- [ ] **Step 5: Update SDK README example**

In `packages/@n8n/sdk/README.md`, add a one-paragraph note documenting that:

- A unique `sessionId` is attached to every request by default.
- Callers can override at `createClient({ caller: { sessionId } })` or per-call via the `caller` field.

Show the snippet:

```ts
const n8n = createClient({
  baseUrl,
  token,
  caller: { kind: 'sdk', name: 'my-app', sessionId: 'daily-digest-2026-05-13' },
});
```

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/sdk/src/proxy.ts packages/@n8n/sdk/src/__tests__/proxy.test.ts packages/@n8n/sdk/README.md
git commit -m "feat(@n8n/sdk): default per-client sessionId with override surface"
```

---

## Phase 3 — Frontend foundation

### Task 8: i18n strings + utility helpers

**Files:**
- Modify: `packages/frontend/@n8n/i18n/src/locales/en.json`
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/executions.utils.ts`
- Test: `packages/frontend/editor-ui/src/features/execution/executions/executions.utils.test.ts`

- [ ] **Step 1: Add failing tests for new helpers**

Add to `executions.utils.test.ts`:

```ts
import { formatSessionShortId, getSessionGroupKey, partitionExecutionsBySession } from './executions.utils';

describe('formatSessionShortId', () => {
  it('returns the first 6 chars + ellipsis for long ids', () => {
    expect(formatSessionShortId('a3f24c-very-long-session-id')).toBe('a3f24c…');
  });
  it('returns the id verbatim when short', () => {
    expect(formatSessionShortId('abc')).toBe('abc');
  });
  it('returns empty string for undefined', () => {
    expect(formatSessionShortId(undefined)).toBe('');
  });
});

describe('partitionExecutionsBySession', () => {
  const rowWith = (id: string, sessionId?: string, mode: 'single-node' | 'manual' = 'single-node') =>
    ({
      id,
      mode,
      caller: sessionId ? { kind: 'mcp' as const, name: 'mcp-server', sessionId } : undefined,
      startedAt: new Date(0).toISOString(),
    });

  it('returns ungrouped rows for executions without sessionId', () => {
    const rows = [rowWith('1'), rowWith('2', undefined, 'manual')];
    const out = partitionExecutionsBySession(rows as any);
    expect(out).toEqual([
      { kind: 'row', execution: rows[0] },
      { kind: 'row', execution: rows[1] },
    ]);
  });

  it('groups rows that share a sessionId', () => {
    const rows = [
      rowWith('a', 's1'),
      rowWith('b', 's1'),
      rowWith('c', undefined, 'manual'),
      rowWith('d', 's2'),
    ];
    const out = partitionExecutionsBySession(rows as any);
    expect(out).toEqual([
      {
        kind: 'group',
        sessionId: 's1',
        executions: [rows[0], rows[1]],
      },
      { kind: 'row', execution: rows[2] },
      { kind: 'row', execution: rows[3] }, // session-of-1 → row, not group
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pushd packages/frontend/editor-ui && pnpm test executions.utils.test.ts 2>&1 | tail -30; popd
```

Expected: fail (helpers don't exist).

- [ ] **Step 3: Add helper functions**

In `packages/frontend/editor-ui/src/features/execution/executions/executions.utils.ts`, add:

```ts
import type { ExecutionSummary } from 'n8n-workflow';
import type { ExecutionSummaryWithScopes, SingleNodeExecutionSummaryExtras } from './executions.types';

/**
 * Short, display-friendly form of a sessionId — first 6 chars + ellipsis when
 * the id is longer. Keeps the list/header chrome tight while leaving the full
 * id reachable in tooltips and filter URLs.
 */
export function formatSessionShortId(sessionId: string | undefined): string {
  if (!sessionId) return '';
  return sessionId.length <= 6 ? sessionId : `${sessionId.slice(0, 6)}…`;
}

/** Helper for the partitioner — extract sessionId or undefined. */
export function getSessionGroupKey(row: ExecutionSummary & SingleNodeExecutionSummaryExtras): string | undefined {
  if (row.mode !== 'single-node') return undefined;
  return row.caller?.sessionId;
}

export type ExecutionListEntry =
  | { kind: 'row'; execution: ExecutionSummaryWithScopes }
  | { kind: 'group'; sessionId: string; executions: ExecutionSummaryWithScopes[] };

/**
 * Partition a list of executions into a mixed sequence of single rows and
 * session groups. A group is formed only when 2+ executions share a sessionId
 * (session-of-1 → flat row, per the design). Ordering: groups appear at the
 * position of their earliest call; ungrouped rows keep their input order.
 */
export function partitionExecutionsBySession(
  executions: ExecutionSummaryWithScopes[],
): ExecutionListEntry[] {
  const sessionMap = new Map<string, ExecutionSummaryWithScopes[]>();
  for (const exec of executions) {
    const key = getSessionGroupKey(exec);
    if (!key) continue;
    const bucket = sessionMap.get(key) ?? [];
    bucket.push(exec);
    sessionMap.set(key, bucket);
  }

  const result: ExecutionListEntry[] = [];
  const consumed = new Set<string>();

  for (const exec of executions) {
    if (exec.id !== undefined && consumed.has(exec.id)) continue;
    const key = getSessionGroupKey(exec);
    const bucket = key ? sessionMap.get(key) : undefined;
    if (key && bucket && bucket.length > 1 && !consumed.has(`session:${key}`)) {
      result.push({ kind: 'group', sessionId: key, executions: bucket });
      consumed.add(`session:${key}`);
      bucket.forEach((b) => b.id !== undefined && consumed.add(b.id));
    } else {
      result.push({ kind: 'row', execution: exec });
      if (exec.id !== undefined) consumed.add(exec.id);
    }
  }

  return result;
}
```

- [ ] **Step 4: Add i18n keys**

Add to `packages/frontend/@n8n/i18n/src/locales/en.json` (inside the existing `executionsList` and `executionDetails` sections):

```json
"executionsList.groupBySession.label": "Group by session",
"executionsList.session.title": "{caller} session",
"executionsList.session.calls": "{count} calls",
"executionsList.session.viewAll": "View all in list",
"executionDetails.singleNode.sessionHeading": "Session · {count} calls",
"executionDetails.singleNode.openSibling": "Open this call"
```

(Place keys alphabetically within their existing section.)

- [ ] **Step 5: Run tests + typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm test executions.utils.test.ts && pnpm typecheck 2>&1 | tail -20; popd
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/executions.utils.ts \
        packages/frontend/editor-ui/src/features/execution/executions/executions.utils.test.ts \
        packages/frontend/@n8n/i18n/src/locales/en.json
git commit -m "feat(editor-ui): add session partitioning helpers and i18n keys"
```

---

## Phase 4 — List view

### Task 9: "Group by session" toggle composable

**Files:**
- Create: `packages/frontend/editor-ui/src/features/execution/executions/composables/useGroupBySession.ts`
- Test: `packages/frontend/editor-ui/src/features/execution/executions/composables/useGroupBySession.test.ts`

- [ ] **Step 1: Write the failing composable test**

In the new test file:

```ts
import { setActivePinia, createPinia } from 'pinia';
import { useGroupBySession } from './useGroupBySession';

describe('useGroupBySession', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
  });

  it('defaults to true', () => {
    const { enabled } = useGroupBySession();
    expect(enabled.value).toBe(true);
  });

  it('persists toggle state across instantiations', () => {
    const { enabled, setEnabled } = useGroupBySession();
    setEnabled(false);
    const next = useGroupBySession();
    expect(next.enabled.value).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pushd packages/frontend/editor-ui && pnpm test useGroupBySession 2>&1 | tail -20; popd
```

Expected: fail (composable doesn't exist).

- [ ] **Step 3: Implement the composable**

Create `useGroupBySession.ts`:

```ts
import { ref, watch } from 'vue';

const STORAGE_KEY = 'executions.groupBySession';

function readInitial(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

export function useGroupBySession() {
  const enabled = ref(readInitial());

  watch(enabled, (next) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
    }
  });

  function setEnabled(value: boolean) {
    enabled.value = value;
  }

  return { enabled, setEnabled };
}
```

- [ ] **Step 4: Run tests + typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm test useGroupBySession && pnpm typecheck 2>&1 | tail -20; popd
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/composables/useGroupBySession.ts \
        packages/frontend/editor-ui/src/features/execution/executions/composables/useGroupBySession.test.ts
git commit -m "feat(editor-ui): useGroupBySession composable with localStorage persistence"
```

---

### Task 10: `ExecutionsSessionGroup.vue` component

**Files:**
- Create: `packages/frontend/editor-ui/src/features/execution/executions/components/global/ExecutionsSessionGroup.vue`
- Test: `packages/frontend/editor-ui/src/features/execution/executions/components/global/ExecutionsSessionGroup.test.ts`

- [ ] **Step 1: Write the failing component test**

```ts
import { renderComponent } from '@/__tests__/render';
import ExecutionsSessionGroup from './ExecutionsSessionGroup.vue';
import type { ExecutionSummaryWithScopes } from '../../executions.types';

const sessionRows: ExecutionSummaryWithScopes[] = [
  {
    id: 'a',
    mode: 'single-node',
    status: 'success',
    startedAt: new Date('2026-05-13T10:32:00Z').toISOString(),
    caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'a3f24c' },
  } as any,
  {
    id: 'b',
    mode: 'single-node',
    status: 'error',
    startedAt: new Date('2026-05-13T10:33:00Z').toISOString(),
    caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'a3f24c' },
  } as any,
];

describe('ExecutionsSessionGroup', () => {
  it('renders the caller kind badge and short session id', () => {
    const { getByTestId, getByText } = renderComponent(ExecutionsSessionGroup, {
      props: { sessionId: 'a3f24c', executions: sessionRows },
    });
    expect(getByTestId('executions-session-group')).toBeVisible();
    expect(getByText(/a3f24c/)).toBeVisible();
    expect(getByText(/MCP/)).toBeVisible();
  });

  it('emits a toggle when the header is clicked', async () => {
    const { getByTestId, emitted } = renderComponent(ExecutionsSessionGroup, {
      props: { sessionId: 'a3f24c', executions: sessionRows },
    });
    await getByTestId('executions-session-group-header').click();
    expect(emitted('toggle')).toBeTruthy();
  });

  it('renders status rollup (1 success / 1 error)', () => {
    const { getByText } = renderComponent(ExecutionsSessionGroup, {
      props: { sessionId: 'a3f24c', executions: sessionRows },
    });
    expect(getByText(/1✓/)).toBeVisible();
    expect(getByText(/1✗/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pushd packages/frontend/editor-ui && pnpm test ExecutionsSessionGroup 2>&1 | tail -20; popd
```

Expected: fail (component doesn't exist).

- [ ] **Step 3: Create the component**

```vue
<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import type { ExecutionSummaryWithScopes } from '../../executions.types';
import { CALLER_SOURCE_LABEL, formatSessionShortId } from '../../executions.utils';

const props = defineProps<{
  sessionId: string;
  executions: ExecutionSummaryWithScopes[];
  defaultExpanded?: boolean;
}>();

const emit = defineEmits<{
  toggle: [expanded: boolean];
}>();

const locale = useI18n();
const expanded = ref(props.defaultExpanded ?? props.executions.length <= 5);

const callerKind = computed(() => props.executions[0]?.caller?.kind ?? 'mcp');
const callerName = computed(() => props.executions[0]?.caller?.name ?? '');
const callerBadgeText = computed(
  () => CALLER_SOURCE_LABEL[callerKind.value] ?? callerKind.value.toUpperCase(),
);

const rollup = computed(() => {
  const success = props.executions.filter((e) => e.status === 'success').length;
  const error = props.executions.filter((e) => e.status === 'error' || e.status === 'crashed').length;
  return { success, error };
});

const timeRange = computed(() => {
  const sorted = [...props.executions].sort(
    (a, b) => new Date(a.startedAt ?? 0).getTime() - new Date(b.startedAt ?? 0).getTime(),
  );
  return {
    earliest: sorted[0]?.startedAt,
    latest: sorted[sorted.length - 1]?.startedAt,
  };
});

function onToggle() {
  expanded.value = !expanded.value;
  emit('toggle', expanded.value);
}
</script>

<template>
  <section
    :class="$style.group"
    data-test-id="executions-session-group"
  >
    <header
      :class="$style.header"
      data-test-id="executions-session-group-header"
      role="button"
      tabindex="0"
      @click="onToggle"
      @keydown.enter="onToggle"
      @keydown.space.prevent="onToggle"
    >
      <N8nIcon :icon="expanded ? 'chevron-down' : 'chevron-right'" size="small" />
      <N8nBadge :class="[$style.kindBadge, $style[`kind-${callerKind}`]]">
        {{ callerBadgeText }}
      </N8nBadge>
      <N8nText size="small" bold>{{ callerName }}</N8nText>
      <N8nText size="small" color="text-light">
        {{ formatSessionShortId(sessionId) }}
      </N8nText>
      <N8nText size="small" color="text-light">
        · {{ locale.baseText('executionsList.session.calls', { interpolate: { count: executions.length } }) }}
      </N8nText>
      <span :class="$style.rollup">
        <N8nText v-if="rollup.success > 0" size="xsmall" color="success">{{ rollup.success }}✓</N8nText>
        <N8nText v-if="rollup.error > 0" size="xsmall" color="danger">{{ rollup.error }}✗</N8nText>
      </span>
    </header>
    <div v-show="expanded" :class="$style.children">
      <slot :executions="executions" />
    </div>
  </section>
</template>

<style lang="scss" module>
.group {
  background: var(--color--background--shade-1);
  border-radius: var(--radius);
  margin-bottom: var(--spacing--2xs);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--spacing--2xs);
  padding: var(--spacing--2xs) var(--spacing--xs);
  cursor: pointer;
  user-select: none;

  &:focus-visible {
    outline: 2px solid var(--color--primary);
    outline-offset: -2px;
  }
}

.kindBadge {
  // Caller kind colors share the palette established in earlier phases.
  // Mapping kept in CALLER_SOURCE_LABEL; visual treatment via class names.
}

.kind-mcp { background: var(--color--primary--tint-2); color: var(--color--primary--shade-1); }
.kind-cli { background: var(--color--success--tint-2); color: var(--color--success--shade-1); }
.kind-sdk { background: var(--color--warning--tint-2); color: var(--color--warning--shade-1); }

.rollup {
  margin-left: auto;
  display: inline-flex;
  gap: var(--spacing--2xs);
}

.children {
  padding-left: var(--spacing--m);
}
</style>
```

- [ ] **Step 4: Run tests + typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm test ExecutionsSessionGroup && pnpm typecheck 2>&1 | tail -20; popd
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/global/ExecutionsSessionGroup.vue \
        packages/frontend/editor-ui/src/features/execution/executions/components/global/ExecutionsSessionGroup.test.ts
git commit -m "feat(editor-ui): ExecutionsSessionGroup component"
```

---

### Task 11: Render grouped executions in the global list

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsList.vue`
- Test: extend the existing `GlobalExecutionsList.test.ts`

- [ ] **Step 1: Add the failing test**

In `GlobalExecutionsList.test.ts`, add:

```ts
it('renders a session group when 2+ executions share a sessionId', () => {
  const rows = [
    makeRow({ id: 'a', mode: 'single-node', sessionId: 's1' }),
    makeRow({ id: 'b', mode: 'single-node', sessionId: 's1' }),
    makeRow({ id: 'c', mode: 'manual' }),
  ];
  const { getByTestId } = renderComponent(GlobalExecutionsList, { props: { executions: rows, ... } });
  expect(getByTestId('executions-session-group')).toBeVisible();
});

it('renders solo single-node rows when sessionId is absent', () => {
  const rows = [makeRow({ id: 'a', mode: 'single-node' /* no sessionId */ })];
  const { queryByTestId } = renderComponent(GlobalExecutionsList, { props: { executions: rows, ... } });
  expect(queryByTestId('executions-session-group')).toBeNull();
});

it('does not group when the toggle is off', () => {
  window.localStorage.setItem('executions.groupBySession', 'false');
  const rows = [makeRow({ ..., sessionId: 's1' }), makeRow({ ..., sessionId: 's1' })];
  const { queryByTestId } = renderComponent(GlobalExecutionsList, { props: { executions: rows, ... } });
  expect(queryByTestId('executions-session-group')).toBeNull();
});
```

The exact mocking shape mirrors the existing tests in the file — copy that scaffolding.

- [ ] **Step 2: Run to verify failure**

```bash
pushd packages/frontend/editor-ui && pnpm test GlobalExecutionsList 2>&1 | tail -30; popd
```

Expected: tests fail.

- [ ] **Step 3: Update `GlobalExecutionsList.vue`**

In the script setup, add:

```ts
import ExecutionsSessionGroup from './ExecutionsSessionGroup.vue';
import { useGroupBySession } from '../../composables/useGroupBySession';
import { partitionExecutionsBySession } from '../../executions.utils';

const { enabled: groupBySession } = useGroupBySession();

const entries = computed(() =>
  groupBySession.value ? partitionExecutionsBySession(props.executions) : props.executions.map((e) => ({ kind: 'row' as const, execution: e })),
);
```

In the template, replace the existing `v-for` over executions with:

```vue
<template v-for="(entry, idx) in entries" :key="entry.kind === 'group' ? `g-${entry.sessionId}` : `r-${entry.execution.id ?? idx}`">
  <ExecutionsSessionGroup
    v-if="entry.kind === 'group'"
    :session-id="entry.sessionId"
    :executions="entry.executions"
  >
    <template #default="{ executions: children }">
      <GlobalExecutionsListItem
        v-for="child in children"
        :key="child.id"
        :execution="child"
        ...existing props
      />
    </template>
  </ExecutionsSessionGroup>
  <GlobalExecutionsListItem
    v-else
    :execution="entry.execution"
    ...existing props
  />
</template>
```

Preserve all existing props on `GlobalExecutionsListItem`. The existing iteration's surrounding `<table>`/`<tbody>` structure may need adjustment because session groups are `<section>` elements, not `<tr>`. **Acceptable change:** restructure the list to a `<div>`-based layout if the current `<table>` makes the group hard to render. If `<table>` is non-negotiable, render the session group as a `<tr>` with a single `<td colspan>` that contains the `<section>` and another nested table for children — whichever the test makes work.

- [ ] **Step 4: Add the toolbar toggle in `GlobalExecutionsList.vue`**

Above the list, render:

```vue
<div :class="$style.toolbar" v-if="hasSingleNodeExecutions">
  <N8nSwitch
    :model-value="groupBySession"
    @update:model-value="setEnabled"
    data-test-id="executions-group-by-session-toggle"
  />
  <N8nText size="small">
    {{ locale.baseText('executionsList.groupBySession.label') }}
  </N8nText>
</div>
```

`hasSingleNodeExecutions` is `computed(() => props.executions.some((e) => e.mode === 'single-node'))`. `setEnabled` comes from `useGroupBySession`.

- [ ] **Step 5: Run tests + typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm test GlobalExecutionsList && pnpm typecheck 2>&1 | tail -30; popd
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsList.vue \
        packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsList.test.ts
git commit -m "feat(editor-ui): group single-node executions by session in global list"
```

---

### Task 12: Session-id chip on rows + URL filter

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.vue`
- Modify: `GlobalExecutionsListItem.test.ts`

- [ ] **Step 1: Add the failing test**

```ts
it('renders a session-id chip when caller.sessionId is present', () => {
  const exec = makeExecution({ mode: 'single-node', caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'a3f24c-session' } });
  const { getByTestId } = renderComponent(GlobalExecutionsListItem, { props: { execution: exec, ... } });
  const chip = getByTestId('executions-session-chip');
  expect(chip).toBeVisible();
  expect(chip.textContent).toContain('a3f24c');
});

it('omits the session chip when sessionId is absent', () => {
  const exec = makeExecution({ mode: 'single-node', caller: { kind: 'mcp', name: 'X' } });
  const { queryByTestId } = renderComponent(GlobalExecutionsListItem, { props: { execution: exec, ... } });
  expect(queryByTestId('executions-session-chip')).toBeNull();
});

it('pushes a metadata filter URL on chip click', async () => {
  // mock useRouter().push, assert call args contain { metadata: [{ key: 'caller.sessionId', value: '<id>' }] }
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pushd packages/frontend/editor-ui && pnpm test GlobalExecutionsListItem 2>&1 | tail -30; popd
```

- [ ] **Step 3: Implement the chip**

In `GlobalExecutionsListItem.vue` script:

```ts
import { N8nTag } from '@n8n/design-system';
import { useRouter } from 'vue-router';
import { formatSessionShortId } from '../../executions.utils';

const router = useRouter();

const sessionId = computed(() =>
  isSingleNodeExecution.value ? props.execution.caller?.sessionId : undefined,
);

const sessionShort = computed(() => formatSessionShortId(sessionId.value));

function onSessionChipClick() {
  if (!sessionId.value) return;
  void router.push({
    query: {
      ...router.currentRoute.value.query,
      metadata: `caller.sessionId=${sessionId.value}`,
    },
  });
}
```

In the template, in the same cell that renders the single-node caller label (around line 231), add the chip:

```vue
<small v-if="singleNodeCallerLabel" :class="$style.singleNodeCaller">
  {{ singleNodeCallerLabel }}
</small>
<N8nTag
  v-if="sessionId"
  :class="$style.sessionChip"
  data-test-id="executions-session-chip"
  clickable
  @click.stop="onSessionChipClick"
>
  {{ sessionShort }}
</N8nTag>
```

Style:

```scss
.sessionChip {
  font-family: var(--font-family--mono);
  font-size: var(--font-size--xs);
  margin-left: var(--spacing--3xs);
  cursor: pointer;
}
```

- [ ] **Step 4: Run tests + typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm test GlobalExecutionsListItem && pnpm typecheck 2>&1 | tail -20; popd
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.vue \
        packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.test.ts
git commit -m "feat(editor-ui): clickable session-id chip on single-node rows"
```

---

### Task 13: Migrate caller chip rendering to `N8nBadge`

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.vue`
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsCard.vue`
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.vue`

- [ ] **Step 1: Audit existing chip markup**

Run a search:

```bash
grep -rn "singleNodeCaller\|class=\"chip\|SOURCE_LABEL" packages/frontend/editor-ui/src/features/execution/executions/components/ | head -30
```

Identify every place where the caller-kind appears as a styled `<small>` or `<span>` and not via `N8nBadge`.

- [ ] **Step 2: Swap to `N8nBadge`**

For each call site, replace the inline element with `<N8nBadge :class="$style[`kind-${caller.kind}`]">{{ CALLER_SOURCE_LABEL[caller.kind] ?? caller.kind.toUpperCase() }}</N8nBadge>`. Keep the existing class-based kind coloring (or move it to a shared SCSS partial if the duplication is bothersome).

- [ ] **Step 3: Run frontend tests + typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm test executions && pnpm typecheck 2>&1 | tail -30; popd
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/
git commit -m "refactor(editor-ui): unify caller-kind chips on N8nBadge"
```

---

### Task 14: Drop the `single-node` text badge from list rows

**Files:**
- Modify: `GlobalExecutionsListItem.vue` and any other site rendering the `single-node` text

- [ ] **Step 1: Find any remaining text-badge usages**

```bash
grep -rn "single-node" packages/frontend/editor-ui/src/features/execution/executions/components/ | grep -v test | head
```

Identify spans/text-badges that literally print "single-node" or use `execution.mode === 'single-node'` as a label.

- [ ] **Step 2: Remove the badge but keep the mode-based logic**

The caller chip (`MCP` / `CLI` / `SDK`) already discriminates these rows. Delete only the visible label/badge; keep the `isSingleNodeExecution` computed and related branching logic (it's still used for routing/labeling decisions).

- [ ] **Step 3: Run tests**

```bash
pushd packages/frontend/editor-ui && pnpm test executions 2>&1 | tail -30; popd
```

Expected: pass. If any test asserted the badge text, update that assertion to check the caller chip instead.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/
git commit -m "refactor(editor-ui): drop redundant single-node text badge from list rows"
```

---

## Phase 5 — Single-node detail view

### Task 15: `SingleNodeExecutionDetail.vue` component

**Files:**
- Create: `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/SingleNodeExecutionDetail.vue`
- Create: `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/SingleNodeExecutionDetail.test.ts`

- [ ] **Step 1: Write the failing component test**

```ts
import { renderComponent } from '@/__tests__/render';
import SingleNodeExecutionDetail from './SingleNodeExecutionDetail.vue';

describe('SingleNodeExecutionDetail', () => {
  const baseExecution = {
    id: 'exec-1',
    mode: 'single-node',
    status: 'success',
    caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'a3f24c' },
    actionDisplayName: 'Slack — Post Message',
    credentialId: 'cred-1',
  };

  const runData = {
    Action: [{
      data: { main: [[{ json: { ok: true, ts: '1708' } }]] },
      source: [],
      executionStatus: 'success',
      executionIndex: 0,
      startTime: 0,
      executionTime: 1200,
    }],
  };

  it('renders the action display name as the title', () => {
    const { getByText } = renderComponent(SingleNodeExecutionDetail, {
      props: { execution: baseExecution, runData, executedNodeName: 'Action' },
    });
    expect(getByText('Slack — Post Message')).toBeVisible();
  });

  it('renders the caller bar with chip + session chip', () => {
    const { getByText, getByTestId } = renderComponent(SingleNodeExecutionDetail, {
      props: { execution: baseExecution, runData, executedNodeName: 'Action' },
    });
    expect(getByText('MCP')).toBeVisible();
    expect(getByTestId('executions-session-chip').textContent).toContain('a3f24c');
  });

  it('renders the credential link when credentialId resolves', () => {
    // mock credentialsStore.getCredentialById('cred-1') → { id: 'cred-1', name: 'Slack-Prod' }
    const { getByTestId } = renderComponent(SingleNodeExecutionDetail, {
      props: { execution: baseExecution, runData, executedNodeName: 'Action' },
    });
    const link = getByTestId('single-node-execution-credential');
    expect(link.textContent).toContain('Slack-Prod');
  });

  it('renders deleted-state fallback when credentialId no longer resolves', () => {
    // credentialsStore.getCredentialById('cred-1') → undefined
    const { getByText } = renderComponent(SingleNodeExecutionDetail, {
      props: { execution: { ...baseExecution, credentialId: 'cred-missing' }, runData, executedNodeName: 'Action' },
    });
    expect(getByText(/deleted/i)).toBeVisible();
  });

  it('does not render the rail when no sessionId', () => {
    const noSession = { ...baseExecution, caller: { kind: 'sdk', name: '@n8n/sdk' } };
    const { queryByTestId } = renderComponent(SingleNodeExecutionDetail, {
      props: { execution: noSession, runData, executedNodeName: 'Action' },
    });
    expect(queryByTestId('single-node-execution-rail')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pushd packages/frontend/editor-ui && pnpm test SingleNodeExecutionDetail 2>&1 | tail -30; popd
```

Expected: fail (component doesn't exist).

- [ ] **Step 3: Create the component**

```vue
<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nIcon, N8nText, N8nTag } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useRouter } from 'vue-router';
import type { ExecutionSummary } from 'n8n-workflow';
import type { SingleNodeExecutionSummaryExtras } from '../../executions.types';
import { CALLER_SOURCE_LABEL, formatSessionShortId } from '../../executions.utils';
import SingleNodeExecutionSiblingRail from './SingleNodeExecutionSiblingRail.vue';
import RunData from '@/features/dataDisplay/runData/RunData.vue';

const props = defineProps<{
  execution: ExecutionSummary & SingleNodeExecutionSummaryExtras & { credentialId?: string };
  runData: Record<string, unknown> | undefined;
  executedNodeName: string;
}>();

const locale = useI18n();
const credentialsStore = useCredentialsStore();
const router = useRouter();

const title = computed(
  () => props.execution.actionDisplayName ?? props.execution.actionId ?? props.execution.nodeType ?? props.execution.id,
);

const callerKind = computed(() => props.execution.caller?.kind);
const callerName = computed(() => props.execution.caller?.name);
const sessionId = computed(() => props.execution.caller?.sessionId);

const credentialInfo = computed<{ id: string; name?: string; deleted: boolean } | null>(() => {
  const credId = props.execution.credentialId;
  if (!credId) return null;
  const cred = credentialsStore.getCredentialById(credId);
  return {
    id: credId,
    name: cred?.name,
    deleted: !cred,
  };
});

function onSessionChipClick() {
  if (!sessionId.value) return;
  void router.push({
    query: {
      ...router.currentRoute.value.query,
      metadata: `caller.sessionId=${sessionId.value}`,
    },
  });
}
</script>

<template>
  <section
    :class="$style.detail"
    data-test-id="single-node-execution-detail"
  >
    <header :class="$style.titleRow">
      <N8nText :class="$style.title" tag="h2" size="large" bold>{{ title }}</N8nText>
    </header>

    <div :class="$style.callerBar">
      <N8nBadge v-if="callerKind" :class="$style[`kind-${callerKind}`]">
        {{ CALLER_SOURCE_LABEL[callerKind] ?? callerKind.toUpperCase() }}
      </N8nBadge>
      <N8nText size="small" color="text-base">
        via <strong>{{ callerName }}</strong>
      </N8nText>
      <template v-if="sessionId">
        <N8nText size="small" color="text-light">· session</N8nText>
        <N8nTag
          data-test-id="executions-session-chip"
          clickable
          :class="$style.sessionChip"
          @click="onSessionChipClick"
        >
          {{ formatSessionShortId(sessionId) }}
        </N8nTag>
      </template>
      <div v-if="credentialInfo" :class="$style.credential" data-test-id="single-node-execution-credential">
        <N8nText size="small" color="text-base">
          {{ locale.baseText('executionDetails.singleNode.credentialLabel') }}:
        </N8nText>
        <N8nText v-if="credentialInfo.deleted" size="small" color="text-light">
          {{ locale.baseText('executionDetails.singleNode.credentialDeleted') }}
          ({{ credentialInfo.id }})
        </N8nText>
        <RouterLink
          v-else
          :to="{ name: VIEWS.CREDENTIALS, params: { credentialId: credentialInfo.id } }"
          :class="$style.credentialLink"
        >
          {{ credentialInfo.name ?? credentialInfo.id }}
        </RouterLink>
      </div>
    </div>

    <div :class="$style.body">
      <SingleNodeExecutionSiblingRail
        v-if="sessionId"
        :session-id="sessionId"
        :current-execution-id="execution.id"
        data-test-id="single-node-execution-rail"
      />
      <div :class="$style.panes">
        <div :class="$style.pane">
          <N8nText :class="$style.paneLabel" size="xsmall" color="text-light" bold>
            {{ locale.baseText('executionDetails.singleNode.inputLabel') }}
          </N8nText>
          <RunData
            v-if="runData"
            :node-name="executedNodeName"
            :run-data="runData"
            display="input"
          />
        </div>
        <div :class="$style.pane">
          <N8nText :class="$style.paneLabel" size="xsmall" color="text-light" bold>
            {{ locale.baseText('executionDetails.singleNode.outputLabel') }}
          </N8nText>
          <RunData
            v-if="runData"
            :node-name="executedNodeName"
            :run-data="runData"
            display="output"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" module>
.detail {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.titleRow {
  padding: var(--spacing--xs) var(--spacing--m);
  border-bottom: var(--border-width--base) solid var(--color--foreground--shade-1);
}
.title { margin: 0; }
.callerBar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing--2xs);
  padding: var(--spacing--2xs) var(--spacing--m);
  background: var(--color--background--shade-1);
}
.credential {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing--3xs);
}
.credentialLink {
  color: var(--color--primary);
  text-decoration: none;
  &:hover { text-decoration: underline; }
}
.body { display: flex; flex: 1; min-height: 0; }
.panes { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing--s); flex: 1; padding: var(--spacing--s); }
.pane { display: flex; flex-direction: column; gap: var(--spacing--2xs); }
.paneLabel { text-transform: uppercase; letter-spacing: 0.5px; }
.sessionChip { font-family: var(--font-family--mono); }
.kind-mcp { background: var(--color--primary--tint-2); color: var(--color--primary--shade-1); }
.kind-cli { background: var(--color--success--tint-2); color: var(--color--success--shade-1); }
.kind-sdk { background: var(--color--warning--tint-2); color: var(--color--warning--shade-1); }
</style>
```

Add the i18n keys used above to `en.json`:

```json
"executionDetails.singleNode.inputLabel": "Input · parameters",
"executionDetails.singleNode.outputLabel": "Output"
```

(The `credentialLabel` and `credentialDeleted` keys already exist.)

- [ ] **Step 4: Run tests + typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm test SingleNodeExecutionDetail && pnpm typecheck 2>&1 | tail -30; popd
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/workflow/SingleNodeExecutionDetail.vue \
        packages/frontend/editor-ui/src/features/execution/executions/components/workflow/SingleNodeExecutionDetail.test.ts \
        packages/frontend/@n8n/i18n/src/locales/en.json
git commit -m "feat(editor-ui): SingleNodeExecutionDetail component"
```

---

### Task 16: `SingleNodeExecutionSiblingRail.vue` component

**Files:**
- Create: `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/SingleNodeExecutionSiblingRail.vue`
- Create: matching `.test.ts`

- [ ] **Step 1: Write the failing component test**

```ts
import { renderComponent } from '@/__tests__/render';
import SingleNodeExecutionSiblingRail from './SingleNodeExecutionSiblingRail.vue';

describe('SingleNodeExecutionSiblingRail', () => {
  it('renders fetched siblings with the current one highlighted', async () => {
    // mock executionsStore.fetchExecutions({ filter: { metadata: [...] }}) → 3 rows
    const { getByTestId, getAllByTestId, findByTestId } = renderComponent(SingleNodeExecutionSiblingRail, {
      props: { sessionId: 'a3f24c', currentExecutionId: 'b' },
    });

    await findByTestId('single-node-execution-rail-item');
    const items = getAllByTestId('single-node-execution-rail-item');
    expect(items).toHaveLength(3);
    expect(items.find((el) => el.className.includes('active'))?.textContent).toContain('Linear');
  });

  it('renders empty when fetch returns no siblings', async () => {
    // mock empty
    const { findByText } = renderComponent(SingleNodeExecutionSiblingRail, {
      props: { sessionId: 'empty', currentExecutionId: 'b' },
    });
    expect(await findByText(/no other calls/i)).toBeVisible();
  });

  it('renders nothing visible when fetch fails (logs only)', async () => {
    // mock fetchExecutions rejects → component renders a tiny inert shell
    const { container } = renderComponent(SingleNodeExecutionSiblingRail, {
      props: { sessionId: 'broken', currentExecutionId: 'b' },
    });
    // assert it doesn't throw and renders a minimal element
    expect(container.firstChild).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pushd packages/frontend/editor-ui && pnpm test SingleNodeExecutionSiblingRail 2>&1 | tail -30; popd
```

- [ ] **Step 3: Implement the rail**

```vue
<script lang="ts" setup>
import { computed, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useExecutionsStore } from '../../executions.store';
import type { ExecutionSummaryWithScopes } from '../../executions.types';
import { VIEWS } from '@/app/constants';

const props = defineProps<{
  sessionId: string;
  currentExecutionId: string | undefined;
}>();

const locale = useI18n();
const router = useRouter();
const executionsStore = useExecutionsStore();

const siblings = ref<ExecutionSummaryWithScopes[]>([]);
const loading = ref(true);
const failed = ref(false);

watchEffect(async () => {
  loading.value = true;
  failed.value = false;
  try {
    const result = await executionsStore.fetchExecutions({
      metadata: [{ key: 'caller.sessionId', value: props.sessionId }],
    });
    siblings.value = (result?.results ?? []).slice(0, 50);
  } catch {
    failed.value = true;
    siblings.value = [];
  } finally {
    loading.value = false;
  }
});

function navigateTo(exec: ExecutionSummaryWithScopes) {
  if (!exec.id || exec.id === props.currentExecutionId) return;
  void router.push({
    name: VIEWS.EXECUTION_PREVIEW,
    params: { workflowId: exec.workflowId, executionId: exec.id },
  });
}

function viewAll() {
  void router.push({
    query: {
      ...router.currentRoute.value.query,
      metadata: `caller.sessionId=${props.sessionId}`,
    },
  });
}

const heading = computed(() =>
  locale.baseText('executionDetails.singleNode.sessionHeading', {
    interpolate: { count: siblings.value.length },
  }),
);
</script>

<template>
  <aside :class="$style.rail" data-test-id="single-node-execution-rail">
    <N8nText :class="$style.title" size="xsmall" color="text-light" bold>{{ heading }}</N8nText>
    <template v-if="loading">
      <N8nText size="small" color="text-light">…</N8nText>
    </template>
    <template v-else-if="failed">
      <!-- silent shell: empty body, error already logged -->
    </template>
    <template v-else-if="siblings.length === 0">
      <N8nText size="small" color="text-light">
        {{ locale.baseText('executionDetails.singleNode.railEmpty') }}
      </N8nText>
    </template>
    <ol v-else :class="$style.items">
      <li
        v-for="exec in siblings"
        :key="exec.id"
        :class="[$style.item, exec.id === currentExecutionId ? $style.active : '']"
        data-test-id="single-node-execution-rail-item"
        @click="navigateTo(exec)"
      >
        <N8nIcon
          :icon="exec.status === 'success' ? 'circle-check' : exec.status === 'error' || exec.status === 'crashed' ? 'circle-x' : 'circle-dashed'"
          size="small"
          :color="exec.status === 'success' ? 'success' : exec.status === 'error' || exec.status === 'crashed' ? 'danger' : 'secondary'"
        />
        <N8nText size="small" :class="$style.label">
          {{ exec.actionDisplayName ?? exec.nodeType ?? exec.id }}
        </N8nText>
      </li>
    </ol>
    <button v-if="siblings.length > 0" type="button" :class="$style.viewAll" @click="viewAll">
      {{ locale.baseText('executionsList.session.viewAll') }} →
    </button>
  </aside>
</template>

<style lang="scss" module>
.rail {
  width: 200px;
  padding: var(--spacing--xs);
  background: var(--color--background--shade-1);
  border-right: var(--border-width--base) solid var(--color--foreground--shade-1);
  display: flex;
  flex-direction: column;
  gap: var(--spacing--2xs);
  overflow-y: auto;
}
.title { text-transform: uppercase; letter-spacing: 0.5px; }
.items { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--spacing--3xs); }
.item {
  display: flex;
  align-items: center;
  gap: var(--spacing--2xs);
  padding: var(--spacing--2xs) var(--spacing--3xs);
  border-radius: var(--radius);
  cursor: pointer;
  &:hover { background: var(--color--background--xlight); }
}
.active {
  background: var(--color--background--xlight);
  border: var(--border-width--base) solid var(--color--primary--tint-1);
  font-weight: var(--font-weight--bold);
}
.label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.viewAll {
  background: none;
  border: none;
  color: var(--color--primary);
  font-size: var(--font-size--xs);
  text-align: left;
  padding: var(--spacing--3xs);
  cursor: pointer;
  &:hover { text-decoration: underline; }
}
</style>
```

Add i18n key:

```json
"executionDetails.singleNode.railEmpty": "No other calls in this session"
```

- [ ] **Step 4: Run tests + typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm test SingleNodeExecutionSiblingRail && pnpm typecheck 2>&1 | tail -30; popd
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/workflow/SingleNodeExecutionSiblingRail.vue \
        packages/frontend/editor-ui/src/features/execution/executions/components/workflow/SingleNodeExecutionSiblingRail.test.ts \
        packages/frontend/@n8n/i18n/src/locales/en.json
git commit -m "feat(editor-ui): SingleNodeExecutionSiblingRail with metadata-filter fetch"
```

---

### Task 17: Branch `WorkflowExecutionsPreview.vue` to use the new detail view

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.vue`
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.test.ts`

- [ ] **Step 1: Add the failing tests**

```ts
it('renders SingleNodeExecutionDetail when mode is single-node', () => {
  const exec = { ...baseExecution, mode: 'single-node', caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 's1' } };
  const { getByTestId, queryByTestId } = renderComponent(WorkflowExecutionsPreview, { props: { execution: exec } });
  expect(getByTestId('single-node-execution-detail')).toBeVisible();
  expect(queryByTestId('workflow-preview')).toBeNull();
});

it('renders the standard WorkflowPreview for workflow modes', () => {
  const exec = { ...baseExecution, mode: 'manual' };
  const { getByTestId, queryByTestId } = renderComponent(WorkflowExecutionsPreview, { props: { execution: exec } });
  expect(getByTestId('workflow-preview')).toBeVisible();
  expect(queryByTestId('single-node-execution-detail')).toBeNull();
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pushd packages/frontend/editor-ui && pnpm test WorkflowExecutionsPreview 2>&1 | tail -30; popd
```

- [ ] **Step 3: Branch the render**

In `WorkflowExecutionsPreview.vue`, import `SingleNodeExecutionDetail` and gate the `<WorkflowPreview>` render:

```vue
<script lang="ts" setup>
import SingleNodeExecutionDetail from './SingleNodeExecutionDetail.vue';
// ...existing imports

const isSingleNode = computed(() => props.execution?.mode === 'single-node');
const executedNodeName = computed(() => {
  // Hub placeholders execute exactly one node, conventionally named "Action".
  // Read from the execution's runData if available; default to "Action".
  return props.execution?.executedNode ?? 'Action';
});
</script>

<template>
  <div :class="$style.preview">
    <SingleNodeExecutionDetail
      v-if="isSingleNode"
      :execution="execution"
      :run-data="executionRunData"
      :executed-node-name="executedNodeName"
    />
    <WorkflowPreview
      v-else
      data-test-id="workflow-preview"
      ...existing props
    />
  </div>
</template>
```

Where `executionRunData` comes from the existing data path the preview already uses to power the canvas. Find the existing source by searching the file for `runData` references.

Also delete the existing inline "Back to list" link in the template (search for `'Back to list'` or `back-to-list`), since the breadcrumb already covers it.

- [ ] **Step 4: Run tests + typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm test WorkflowExecutionsPreview && pnpm typecheck 2>&1 | tail -30; popd
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.vue \
        packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.test.ts
git commit -m "feat(editor-ui): branch to node-direct detail view for single-node executions"
```

---

## Phase 6 — Smoke validation

### Task 18: Manual smoke test

**Files:** (no code)

- [ ] **Step 1: Build the affected packages**

```bash
pnpm build > build.log 2>&1
tail -n 30 build.log
```

Expected: clean build.

- [ ] **Step 2: Start a dev instance**

```bash
pnpm dev
```

In a second terminal, set up an API key (or reuse one) and run:

```bash
# Fire two CLI calls in one process (one sessionId)
n8n exec run set.json --param mode=raw
n8n exec run set.json --param mode=expression

# These should land in the same session in the executions list.

# Fire one CLI call with an explicit session id
n8n exec run set.json --param mode=raw --session demo-session-1

# Use the SDK
node -e "
  const { createClient } = require('./packages/@n8n/sdk/dist');
  const n8n = createClient({ baseUrl: 'http://localhost:5678', token: '<PAT>' });
  n8n.set.json({ mode: 'raw' }).then(() => n8n.set.json({ mode: 'expression' }));
"
```

- [ ] **Step 3: Verify in the UI**

Open `http://localhost:5678/executions`:
- "Group by session" toggle visible (because single-node executions exist).
- CLI calls from the same process appear under one session block.
- The explicit-session CLI call appears under its own session block with the supplied id.
- SDK calls appear under one session block (the createClient-default uuid).
- Solo single-node calls (none in this smoke unless you mix in MCP without session) appear as flat rows.

- [ ] **Step 4: Verify the detail view**

Click any single-node execution:
- No canvas. Two panes: input + output (RunData).
- Caller bar shows the kind badge, the caller name, the session-id chip, and the credential link (if `--credential` was passed).
- Sibling rail on the left when sessionId is present.
- Clicking a sibling navigates to that execution.
- Clicking the session-id chip filters the list to that session.

- [ ] **Step 5: Document any deviations**

If any acceptance criteria from the spec are unmet, file them as follow-up tasks at the bottom of this plan or open a Linear ticket.

---

## Phase 7 — Final cleanup

### Task 19: Repo-wide typecheck + lint

- [ ] **Step 1: Run from each touched package**

```bash
pushd packages/@n8n/api-types && pnpm typecheck && pnpm lint && popd
pushd packages/cli && pnpm typecheck && pnpm lint && popd
pushd packages/@n8n/cli && pnpm typecheck && pnpm lint && popd
pushd packages/@n8n/sdk && pnpm typecheck && pnpm lint && popd
pushd packages/frontend/editor-ui && pnpm typecheck && pnpm lint && popd
```

Expected: no errors in any package.

- [ ] **Step 2: Apply the n8n:design-system skill review**

For each new `.vue` file (`ExecutionsSessionGroup.vue`, `SingleNodeExecutionDetail.vue`, `SingleNodeExecutionSiblingRail.vue`) and the modified ones, manually review against `packages/frontend/@n8n/design-system/src/styleguide/*.mdx`:

- No legacy tokens.
- No hardcoded `px` for spacing.
- All visible text uses `@n8n/i18n`.
- Only icons from `updatedIconSet`.

Fix any violations inline; commit as `style(editor-ui): design-system compliance pass`.

- [ ] **Step 3: Final commit if anything changed**

```bash
git add -A
git commit -m "style(editor-ui): design-system compliance pass for hub sessions UI"
```

---

## Notes on dependencies / ordering

- Task 1 must precede Tasks 2, 3, 4, 6, 7, 12, 15.
- Tasks 4–7 can run in parallel by separate subagents after Task 3 lands (none of them touch each other).
- Tasks 8–14 form a chain (frontend list); 9 must precede 11.
- Tasks 15–17 form a chain (detail view); 15 must precede 17.
- Tasks 13, 14, 19 are cleanup; run after the corresponding feature tasks are in.

## Out of scope (per spec)

- Dedicated `(key, value)` index on `ExecutionMetadata`.
- `sessionLabel` on the caller payload.
- Dedicated "Session" filter input in the filter sidebar.
- Session-transcript view.
- Playwright spec (defer unless flakes surface in manual testing).

## Deferred from this plan (vs. spec)

- **MCP transport-default `sessionId`.** The spec proposed that the MCP server use its existing per-connection transport session id as the default when the agent doesn't pass one in the tool input. This plan implements only the tool-input override (Task 6) — agents must pass `sessionId` explicitly to group. Wiring a transport-level default requires touching the MCP server middleware (`mcp.service.ts`, `mcp-server-middleware.service.ts`) and is a follow-up. The product impact is small: well-behaved agents will pass `sessionId` once they read the tool description; the smoke test will surface whether this is acceptable.
