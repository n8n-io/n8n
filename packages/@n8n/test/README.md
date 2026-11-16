# `@n8n/test`

Execute n8n workflows in a Vitest or Jest test. The library contains the n8n execution engine and the built-in nodes. You do not need an n8n instance, a server, or a database.

## Install

```sh
npm install --save-dev @n8n/test nock
```

Install the version of `@n8n/test` that is equal to the n8n version that you use in production.

## The four steps

```
load ─► mockNode / configureNode / nock ─► executeWorkflow ─► assert on the result
```

1. Load the workflows with `loadPackage`, `loadWorkflows`, or `loadWorkflow`.
2. Replace the parts that must not run. Use `mockNode`, `configureNode`, or nock.
3. Execute one workflow with `executeWorkflow`.
4. Assert on the result. The result holds the data of each node.

Each load call gives new copies of the workflows. A mock in one test does not change the next test.

## Unit test

```typescript
import { expect, test } from 'vitest';
import { executeWorkflow, loadWorkflow, mockNode } from '@n8n/test';
import definition from './new-signup.json';

test('sends an enterprise signup to sales', async () => {
  const workflow = loadWorkflow(definition);
  mockNode(workflow.node('Get customer'), [{ id: 42, name: 'Ada', plan: 'enterprise' }]);
  mockNode(workflow.node('Run sales workflow'), [{ notified: true }]);

  const result = await executeWorkflow(workflow, { input: { body: { customerId: 42 } } });

  expect(result.node('Run sales workflow').input).toEqual([
    { id: 42, name: 'Ada', plan: 'enterprise' },
  ]);
  expect(result.node('Send welcome email').runs).toHaveLength(0);
});
```

`input` is the output of the trigger. The trigger does not run.

`mockNode` accepts five forms:

| Form | Example |
| --- | --- |
| Items | `[{ id: 42 }]` |
| Outputs | `{ outputs: [[], [{ id: 42 }]] }` |
| Error | `{ error: { message: 'CRM is unavailable' } }` |
| Function, for each run | `(items) => [{ count: items.length }]` |
| Function, for each item | `{ each: (item) => [{ price: Number(item.id) * 2 }] }` |

A function can be asynchronous. A function that throws makes the node fail. A function that returns `undefined` fails the execution.

## HTTP test with nock

nock replaces the remote service. The code of the node runs.

```typescript
import nock from 'nock';
import { afterEach, expect, test } from 'vitest';
import { createCredential, executeWorkflow, loadWorkflow, mockNode } from '@n8n/test';
import definition from './new-signup.json';

afterEach(() => nock.cleanAll());

test('requests the customer from the CRM', async () => {
  const workflow = loadWorkflow(definition);
  mockNode(workflow.node('Send welcome email'), [{ sent: true }]);
  nock('https://crm.example.com').get('/customers/42').reply(200, { id: 42, plan: 'free' });

  const result = await executeWorkflow(workflow, {
    input: { body: { customerId: 42 } },
    variables: { crmBaseUrl: 'https://crm.example.com' },
    credentials: {
      'CRM API key': createCredential('httpHeaderAuth', { name: 'X-Api-Key', value: 'test-key' }),
    },
  });

  const [request] = result.node('Get customer').requests;
  expect(request.url).toBe('https://crm.example.com/customers/42');
  expect(request.headers['x-api-key']).toBe('[credential: CRM API key.value]');
});
```

A request that no nock mock matches fails the execution. Clear the nock state after each test.

## Package test

`loadPackage` reads a package from n8n package export. The package can be a directory or a `.n8np` file.

```typescript
import { expect, test } from 'vitest';
import { executeWorkflow, loadPackage, mockNode } from '@n8n/test';

test('the package is complete', () => {
  expect(loadPackage('./packages/sales').issues()).toEqual([]);
});

test('runs the sales workflow as a real child', async () => {
  const workflows = loadPackage('./packages/sales');
  const parent = workflows.get('New signup');
  mockNode(parent.node('Get customer'), [{ id: 42, name: 'Ada', plan: 'enterprise' }]);
  mockNode(workflows.get('Notify sales').node('Post to Slack'), [{ ok: true }]);

  const result = await executeWorkflow(parent, { input: { body: { customerId: 42 } } });

  const [salesRun] = result.workflow('Notify sales').runs;
  expect(salesRun.calledBy).toEqual({ workflow: 'New signup', node: 'Run sales workflow' });
});
```

- `workflows.get` accepts a name, an ID, or the `target` path from the manifest.
- A sub-workflow call runs the child from the set. Mock the calling node to stop at the boundary.
- `workflows.requirements` lists the credentials, variables, data tables, child workflows, and node types that the workflows need.
- `workflows.issues()` reports a child that the package does not hold, a node type that is not installed, and a contract mismatch between a parent and its child. For a set from `loadWorkflows`, `issues()` reports only the contract checks.
- The library does not read values from the package. The test supplies each credential, variable, and secret.

## `executeWorkflow` options

| Option | Meaning |
| --- | --- |
| `input` | The output of the trigger. One object, or an array of objects. |
| `trigger` | The trigger node, as a name or a reference. Necessary when the workflow has more than one trigger. |
| `now` | The time for `$now` and `$today`. |
| `staticData` | The workflow static data at the start of the execution. |
| `credentials` | Credentials by name or by ID. Make them with `createCredential(type, data)`. |
| `variables` | The values for `$vars`. `null` means "missing on purpose". |
| `env` | The values for `$env`. The library blocks all other keys. |
| `secrets` | The values for `$secrets`, as vault name, then key. |
| `allowHttp` | `true`, or a list of hosts. Permits requests that match no nock mock. The default is `false`. |
| `redact` | Replaces credential values in the result with placeholders. The default is `true`. |

## Result

| Field | Meaning |
| --- | --- |
| `result.output` | JSON of the items from all runs of the end node, in run order. Throws if more than one end node ran. |
| `result.response` | The webhook response: status, headers, and body. Only for webhook triggers. |
| `result.staticData` | The workflow static data at the end of the execution. |
| `result.customData` | The execution custom data that the workflow set. |
| `result.node(node).runs` | One entry for each run of the node. Accepts a name or a reference. |
| `result.workflow(name).runs` | One entry for each run of a child. Each entry has `calledBy`, `node(name)`, and `output`. |
| `run.input`, `run.output`, `run.outputs` | JSON of the items that entered and left the node. |
| `run.parameters` | The resolved parameters, one entry for each input item. |
| `run.requests` | The HTTP requests that the node made. A streamed request body shows as `[stream]`. |
| `run.error` | The error, if the node failed. |

`result.node(node)` also has `input`, `output`, `outputs`, `parameters`, `requests`, and `error`. These read the only run. They throw if the node ran more than one time or did not run.

## Errors

A failed execution rejects with a `WorkflowTestError`. The error has `code`, `workflow`, `node`, `message`, and the partial `result`. A handled error (Continue On Fail, or an error output) does not reject.

| Code | Cause |
| --- | --- |
| `NODE_FAILED` | A node failed and the workflow did not handle the error. |
| `NODE_TYPE_NOT_INSTALLED` | A node type or node version is not installed, and the node has no mock. |
| `CREDENTIAL_NOT_SUPPLIED` | A node with no mock needs a credential that the test did not supply. |
| `CREDENTIAL_NOT_FOUND` | `configureNode` names a credential that the node does not use. |
| `CREDENTIAL_TYPE_UNKNOWN` | `createCredential` received an unknown credential type. |
| `CREDENTIAL_TYPE_MISMATCH` | The supplied credential has a different type than the node needs. |
| `VARIABLE_NOT_SUPPLIED` | The workflow reads a variable that the test did not supply. |
| `SECRET_NOT_SUPPLIED` | The workflow reads a secret that the test did not supply. |
| `HTTP_NOT_MOCKED` | A request matched no nock mock, and `allowHttp` does not permit the host. |
| `SUB_WORKFLOW_NOT_IN_SET` | A node calls a child that the set does not hold. |
| `SUB_WORKFLOW_SOURCE_NOT_SUPPORTED` | A node loads its child from a local file or a URL. |
| `CONTRACT_MISMATCH` | A parent sends fields that its child does not declare, or the reverse. |
| `CODE_NODE_NOT_MOCKED` | A Python Code node has no mock. |
| `WAIT_NOT_MOCKED` | A node waits for a webhook, a form, or a reply, and has no mock. |
| `DATA_TABLE_NOT_MOCKED` | A Data Table node has no mock. |
| `BINARY_NOT_SUPPORTED` | The webhook responds with binary data. |
| `MOCK_INVALID_OUTPUT` | A mock returned a value that is not items or `{ outputs }`. |
| `TRIGGER_NOT_FOUND` | The workflow has no active trigger, more than one trigger, or the `trigger` option names a node that is not a trigger. |
| `NODE_NOT_FOUND` | `workflow.node(name)` received an unknown name, or `result.node(node)` received a reference from another workflow. |
| `NODE_RUN_COUNT` | A shortcut on `result.node(node)` read a node that ran more than one time or did not run. |
| `MULTIPLE_END_NODES` | `result.output` read a workflow that ended on more than one node. |
| `WORKFLOW_NOT_FOUND` | `workflows.get` received an unknown name, ID, or target. |
| `WORKFLOW_AMBIGUOUS` | More than one workflow has the name. |
| `INVALID_WORKFLOW` | The workflow JSON has an unknown value, or a child has no Execute Workflow Trigger. |
| `INVALID_PACKAGE` | The package path does not exist, or the package has no manifest, an invalid manifest, or an invalid workflow file. |
| `INVALID_OPTION` | An option of `executeWorkflow` has an invalid value. |
| `EXECUTION_IN_PROGRESS` | A second execution started before the first one finished. |

## Code node

The JavaScript Code node runs for real. The library starts the JavaScript runner of n8n in a worker thread when the first Code node runs, and keeps the worker for the later Code nodes of the test process. The code runs in the same `vm` sandbox as in production, with the same `require` rules. The runner hardens only the worker. The test process does not change. A request from the code through `this.helpers.httpRequest` goes through nock, and the Code node records it in `requests`. The code has no other HTTP client: `fetch`, `XMLHttpRequest`, and `WebSocket` are not defined, and a `require` of `http`, `https`, or `undici` fails. The Python Code node needs `mockNode`.

These differences from production remain:

- **The runner runs in a worker thread.** Production runs it in a separate process. The worker shares the memory and the CPU of the test process. The library copies each message through JSON, as the production socket does, so the code cannot change the state of the engine. The worker gets an empty environment, so the runner freezes the global prototypes as in production.
- **Start time.** The first Code node of a test file waits for the worker to start. This takes approximately 0.5 to 1 second.
- **A stopped worker.** If the worker stops during a Code node, the execution fails with `NODE_FAILED`. The next Code node starts a new worker.
- **Task timeout.** The runner stops a stuck `await` after 300 seconds, as in production. A loop that blocks the worker after an `await` is not stopped. Production restarts the runner in this case. The test fails at the timeout of the test framework.
- **Production defaults.** The runner does not read `NODE_FUNCTION_ALLOW_BUILTIN`, `NODE_FUNCTION_ALLOW_EXTERNAL`, or `N8N_RUNNERS_INSECURE_MODE`. A `require` of a module fails as in a production instance with the default settings.
- **Variables.** `$vars` in the code returns `undefined` for a variable that the test did not supply, as in production. An expression fails with `VARIABLE_NOT_SUPPLIED`.

## Known limits

- **One execution at a time.** Await each `executeWorkflow` call before you start the next. Test files can run in separate processes.
- **An execution that never resolves** leaves the process environment, the network block, and the execution lock in place for the rest of the test file.
- **Net connect.** An execution enables net connect when it ends. A test that calls `nock.disableNetConnect()` itself must call it again after each execution.
- **Requests through `fetch`.** A request through the global `fetch` that a nock mock answers is not in `requests`. nock gives no process-wide event for a matched request.
- **Node types.** The library loads `n8n-nodes-base`. It loads `@n8n/n8n-nodes-langchain` only if the test project installs it. It loads a community package only if the `package.json` of the test project lists it and the package has an `n8n` field. The library reads the `package.json` in the current working directory.
- **Credential types.** `createCredential` knows only the credential types of `n8n-nodes-base`.
- **A mocked node of a type that is not installed** runs. Its `parameters` entries are empty.
- **AI nodes.** Mock the agent node. Its model, memory, and tool sub-nodes then do not run.
- **Waits.** A Wait node with a time interval continues immediately. A wait for a webhook, a form, or a reply needs `mockNode`.
- **Data tables** need `mockNode`.
- **Binary data.** Mocks and results hold JSON only.
- **Sub-workflow sources.** The sources `database` and `parameter` work. The sources `localFile` and `url` fail.
- **Fixed runtime values.** `$execution.mode` is always `production`. `$execution.id` is `test-execution-1` for the parent. Each child run gets the next number.
- **Not used.** Pinned data in the workflow JSON. The error workflow.
- **Redaction** replaces only the credential values that the test supplied. It cannot find a value that a node derived from a secret.
- **Only HTTP.** The library cannot intercept a database connection, SMTP, SSH, a file write, or a shell command. Use `mockNode` for these nodes.
- **Packages.** The library reads archived workflows in a package as normal workflows.
