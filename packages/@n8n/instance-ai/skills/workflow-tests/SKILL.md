---
name: workflow-tests
description: >-
  Write, fix and run automated tests for an existing workflow with the
  @n8n/test Vitest library. Load it when the user asks to generate, add,
  change, fix or run tests for a workflow, or opens the Assistant from the
  Tests tab of a workflow.
recommended_tools:
  - workflow-tests
  - get_workflow
  - ask_user
---

# Workflow tests

A workflow has one test file. The file is a Vitest file that uses the
`@n8n/test` library. The library runs the real n8n execution engine and the
built-in nodes. It needs no n8n instance and no database. The test supplies
the trigger input, mocks the nodes that must not run, executes the workflow,
and asserts on the result.

Use the `workflow-tests` tool to read (`get`), save (`save`) and run (`run`)
the file. A run uses the saved draft of the workflow.

## Procedure

1. Read the workflow with `get_workflow`. Note the trigger, every node name,
   every branch (IF, Switch, error outputs), the nodes that need a credential,
   the expressions that read `$vars` or `$env`, and the Execute Workflow nodes
   that call a sub-workflow.
2. Read the current file with `workflow-tests` `get`. If a file exists, keep
   its tests. Add tests or fix tests, but do not remove a test unless the user
   asks for it.
3. Write the file. Write one test for each path through the workflow that a
   user cares about. Three to six tests are usually enough. If the workflow
   calls a sub-workflow, also write the contract tests in
   [Sub-workflows and contracts](#sub-workflows-and-contracts).
4. Save the file with `save`, then `run` it.
5. If a test fails, read the error:
   - The test is wrong (a wrong node name, a wrong mock shape, a wrong
     expected value): fix the test, save, and run again.
   - The workflow is wrong (the test describes the intended behavior, but the
     workflow does something else): do not change the workflow, and do not
     weaken the test until it passes. Tell the user what the workflow does and
     what you expected.
   Stop after three runs that fail for test reasons. Tell the user what
   still fails.
6. Report the result in a short summary: which tests pass, which fail, and
   why. Do not paste the whole file into the chat. The user sees it in the
   Tests tab.

## File rules

The server runs the file in an empty temporary directory. It exports the
workflow and its sub-workflows as an n8n package to `./package`, next to the
test file. The package holds no credential values and no variable values.

- Import only from `vitest`, `@n8n/test` and `nock`. Import `vi` from
  `vitest` when you use `vi.fn`. There are no globals. Other packages and
  relative files do not resolve. The only relative path is `./package`.
- Load the workflow from the package by its id, in each test:

  ```typescript
  const workflows = await loadPackage('./package');
  const workflow = workflows.get('<workflowId>');
  ```

  Never import `workflow.json`. A name can change, the id cannot.
- Supply each credential that a node uses when the node runs without a mock,
  with `createCredential(type, data)`. Supply each variable that the workflow
  reads.
- Use test names that describe behavior, for example
  `'routes an enterprise customer to sales'`. The Tests tab shows the names.
- Write each node name as a string literal in `.node('Name')`. The Tests tab
  reads the names from the source to mark the mocked and the asserted nodes
  on the canvas. Do not build a node name in a variable or a template.

## API

```typescript
import { expect, test } from 'vitest';
import { executeWorkflow, loadPackage, mockNode } from '@n8n/test';

test('sends an enterprise signup to sales', async () => {
  const workflows = await loadPackage('./package');
  const workflow = workflows.get('<workflowId>');
  mockNode(workflow.node('Get customer'), [{ id: 42, name: 'Ada', plan: 'enterprise' }]);
  mockNode(workflow.node('Run sales workflow'), [{ notified: true }]);

  const result = await executeWorkflow(workflow, {
    input: { body: { customerId: 42 } },
    variables: { crmBaseUrl: 'https://crm.example.com' },
  });

  expect(result.node('Run sales workflow').input).toEqual([
    { id: 42, name: 'Ada', plan: 'enterprise' },
  ]);
  expect(result.node('Send welcome email').runs).toHaveLength(0);
});
```

`input` is the output of the trigger. The trigger does not run. For a webhook
trigger, the item usually has `body`, `headers` and `query`.

### `mockNode(node, mock)`

The mocked node does not run. It returns the mock.

| Form | Example |
| --- | --- |
| Items | `[{ id: 42 }]` |
| Outputs, one array per output | `{ outputs: [[], [{ id: 42 }]] }` |
| Error | `{ error: { message: 'CRM is unavailable' } }` |
| Function, for each run | `(items) => [{ count: items.length }]` |
| Function, for each item | `{ each: (item) => [{ price: Number(item.id) * 2 }] }` |

A node of a sub-workflow: `workflows.get('<childId or name>').node('Name')`.

### `executeWorkflow(workflow, options)`

| Option | Meaning |
| --- | --- |
| `input` | The output of the trigger. One object or an array of objects. |
| `trigger` | The trigger node. Necessary when the workflow has more than one trigger. |
| `now` | The time for `$now` and `$today`. |
| `staticData` | The workflow static data at the start. |
| `credentials` | By credential name or id: `{ 'CRM API key': createCredential('httpHeaderAuth', { name: 'X-Api-Key', value: 'k' }) }` |
| `variables` | The values for `$vars`. `null` means missing on purpose. |
| `env` | The values for `$env`. |
| `secrets` | The values for `$secrets`, as vault name, then key. |

Call `executeWorkflow` one time at a time: await it before the next call.

### Result

| Field | Meaning |
| --- | --- |
| `result.output` | JSON of the items of the end node. Throws if more than one end node ran. |
| `await result.response` | The webhook response: status, headers, body. Webhook triggers only. |
| `result.node(name).runs` | One entry for each run of the node. `[]` if the node did not run. |
| `result.node(name).input` / `.output` / `.outputs` | The items of the only run. Throws if the node did not run, or ran more than one time. |
| `result.node(name).parameters` | The resolved parameters, one entry for each input item. |
| `result.node(name).error` | The error, if the node failed. |
| `result.workflow(name).runs` | One entry for each run of a sub-workflow. |

To check that a node did not run, use `expect(result.node('X').runs).toHaveLength(0)`.

### HTTP with nock

With nock, the HTTP Request node runs for real and nock answers the request.
Use it when the test checks the request itself (URL, headers, body). Clear
nock after each test. A request that no nock mock matches fails the execution.

```typescript
import nock from 'nock';
import { afterEach, expect, test } from 'vitest';
import { createCredential, executeWorkflow, loadPackage } from '@n8n/test';

afterEach(() => nock.cleanAll());

test('requests the customer from the CRM', async () => {
  const workflows = await loadPackage('./package');
  const workflow = workflows.get('<workflowId>');
  nock('https://crm.example.com').get('/customers/42').reply(200, { id: 42, plan: 'free' });

  const result = await executeWorkflow(workflow, {
    input: { body: { customerId: 42 } },
    credentials: {
      'CRM API key': createCredential('httpHeaderAuth', { name: 'X-Api-Key', value: 'test-key' }),
    },
  });

  const [request] = result.node('Get customer').requests;
  expect(request.url).toBe('https://crm.example.com/customers/42');
});
```

`result.node(name).requests` lists the HTTP requests of the node. Credential
values in the result show as placeholders, for example
`'[credential: CRM API key.value]'`.

### Errors

A failed execution rejects with a `WorkflowTestError` that has `code`, `node`
and `message`. To test a failure, use
`await expect(executeWorkflow(...)).rejects.toMatchObject({ code: 'NODE_FAILED', node: 'Name' })`.
A handled error (Continue On Fail, or an error output) does not reject.

Common codes and what to do:

| Code | Fix |
| --- | --- |
| `NODE_NOT_FOUND` | Use the exact node name from the workflow. |
| `CREDENTIAL_NOT_SUPPLIED` | Mock the node, or supply the credential. |
| `VARIABLE_NOT_SUPPLIED` / `SECRET_NOT_SUPPLIED` | Supply it in `variables` or `secrets`. |
| `HTTP_NOT_MOCKED` | Add a nock mock for the request, or mock the node. |
| `CODE_NODE_NOT_MOCKED` | Mock the Python Code node. |
| `WAIT_NOT_MOCKED` | Mock the node that waits for a webhook, a form or a reply. |
| `DATA_TABLE_NOT_MOCKED` | Mock the Data Table node. |
| `TRIGGER_NOT_FOUND` | Set `trigger`. |
| `NODE_RUN_COUNT` | Use `.runs` instead of the single-run shortcut. |
| `MULTIPLE_END_NODES` | Assert on `result.node(name)` instead of `result.output`. |

## Sub-workflows and contracts

A sub-workflow declares its inputs in its Execute Workflow Trigger. The
Execute Workflow node of the parent sends fields to it. When someone changes
the sub-workflow, n8n runs the tests of each parent workflow again. Write the
tests of a parent so that a change to the sub-workflow fails them.

For each workflow that has an Execute Workflow node that calls a sub-workflow
from the database:

1. Add one contract test. It fails when the parent sends a field that the
   sub-workflow does not declare, does not send a declared field, or sends a
   field with a different type:

   ```typescript
   test('sends the fields that its sub-workflows declare', async () => {
     const workflows = await loadPackage('./package');
     const workflow = workflows.get('<workflowId>');

     const mismatches = workflows
       .issues()
       .filter((issue) => issue.code === 'CONTRACT_MISMATCH' && issue.workflow === workflow.name)
       .map((issue) => issue.message);

     expect(mismatches, mismatches.join('\n')).toEqual([]);
   });
   ```

   Keep the second argument of `expect`. The test result shows only the short
   assertion message, and this argument puts the mismatch text into it.

   Filter by `CONTRACT_MISMATCH`. Do not assert `issues()` to be empty:
   `CONTRACT_NOT_CHECKED` only says that n8n could not compare the fields, for
   example when the sub-workflow accepts all data.
2. In at least one behavior test, do not mock the Execute Workflow node. Let
   the real sub-workflow run, and assert on what the parent does with its
   output. Mock the nodes inside the sub-workflow that call an outside system:
   `mockNode(workflows.get('<childId>').node('Name'), [...])`.
3. Check what the parent sends with
   `result.workflow('<child name>').runs[0].node('<trigger name>').output`, or
   assert on the output of the Execute Workflow node.

Other tests of the same workflow can mock the Execute Workflow node to test
one branch at a time.

If the workflow is itself a sub-workflow (it starts with an Execute Workflow
Trigger), supply `input` with the fields that the trigger declares, and test
what it returns.

## What runs and what to mock

- Logic nodes run for real: Set, IF, Switch, Merge, Filter, Code (JavaScript),
  Date & Time, and similar. Do not mock them. They are what the test checks.
- Mock nodes that call an outside system: app nodes (Slack, Gmail, a CRM),
  databases, email, SSH, files. For an HTTP Request node, use `mockNode`, or
  nock when the test checks the request.
- Runs are only for instance owners and admins. If `run` says that the user
  cannot run tests, save the file and tell the user that an owner or admin
  must run it.
- Mock an AI Agent or a chain node. Its model, memory and tool sub-nodes then
  do not run.
- Mock Python Code nodes, Data Table nodes, and nodes that wait for a webhook,
  a form or a reply. A Wait node with a time interval continues at once.
- Mocks and results hold JSON only. Binary data is not supported.
- Pinned data in the workflow is not used.
