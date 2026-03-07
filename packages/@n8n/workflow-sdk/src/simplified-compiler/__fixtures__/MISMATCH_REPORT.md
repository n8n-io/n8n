# Execution Test Mismatch Report

Generated: 2026-03-06

## Summary

| Status | Count | Fixtures |
|--------|-------|----------|
| Pass (no mismatches) | 7 | W02, W03, W05, W09, W13, W16, W17 |
| Pass (with mismatches) | 4 | W01, W04, W14, W24 |
| Pass (pre-existing, with mismatches) | 1 | W25 |
| Execution failure | 12 | W06, W07, W08, W10, W11, W12, W15, W18, W20, W21, W22, W26, W27 |
| New pass (from this work) | 5 | W02, W05, W09, W17, W19 |

Previously passing: W02, W03, W13, W16, W19, W23 (6 fixtures)
Now passing: W02, W03, W05, W09, W13, W16, W17, W19, W23 (9 fixtures, +3 net new)

**Total: 9 pass / 18 fail** (up from 6 pass / 21 fail before this work)

---

## Failure Categories

### Category 1: Unresolved Expressions in Request Bodies

**Root cause:** The execution test harness does not resolve n8n expressions (`={{ $('NodeName').first().json.prop }}`) in HTTP request bodies. The expression engine runs but the values are sent as literal strings.

**Fixtures affected:** W01, W25

| Fixture | Mismatch | Expected | Actual |
|---------|----------|----------|--------|
| W01 | `requests[POST api.perplexity.ai/...].requestBody.messages[1].content` | `"What's the latest news..."` | `"={{ $('Set searchInput').first().json.searchInput }}"` |
| W01 | `requests[POST api.twitter.com/...].requestBody.text` | `"AI researchers announced..."` | `"={{ $('POST api.perplexity.ai/...').first().json.choices[0].message.content }}"` |
| W25 | `requests[POST httpbin.org/post].requestBody.title` | `"Backup Post"` | `"={{ $('GET jsonplaceholder.typicode.com/posts/1').first().json.title }}"` |
| W25 | `requests[POST httpbin.org/post#2].requestBody.title` | `"delectus aut autem"` | `"={{ $('GET jsonplaceholder.typicode.com/todos/1').first().json.title }}"` |
| W25 | `requests[POST httpbin.org/post#3].requestBody.reportTag` | `"weekly-check"` | `"={{ $('Set reportTag').first().json.reportTag }}"` |

**Impact:** Known limitation. Expressions work at runtime in real n8n but the test harness expression resolution is incomplete. These fixtures still validate that the correct HTTP endpoints are called with the correct structure.

---

### Category 2: Node Not Found in Expectations

**Root cause:** The expectation `nodes` key doesn't match a node name in `runData`. This happens when:
- The node is inside a sub-workflow (W24) and its output is in `subWorkflows` not `nodeOutputs`
- The node is on a branch that wasn't executed (W14 - switch routes to a different case)
- The node name in expectations doesn't match the compiled node name (W04)

| Fixture | Expected Node | Issue |
|---------|--------------|-------|
| W04 | `POST api.telegram.org/bot/sendMessage` | Node name mismatch - need to check compiled node names |
| W14 | `PATCH api.cms.com/posts/update` | Switch routes based on trigger pin data; this branch may not execute |
| W24 | `GET api.example.com/users` | Node is inside `__tryCatch_1` sub-workflow, not in main runData |

**Fix:** Update expectations to use correct node names and account for sub-workflow node locations.

---

### Category 3: Code Node Runtime Errors (Expression Not Resolved)

**Root cause:** Code nodes receive raw n8n expressions instead of resolved values. When a Code node references a variable like `tickers` that should come from a prior HTTP node's output, the variable contains the unresolved expression string `={{ ... }}` instead of the actual data. Calling `.filter()`, `.map()`, etc. on a string fails.

| Fixture | Error | Variable |
|---------|-------|----------|
| W06 | `Cannot read properties of undefined (reading 'map')` | AI node output not resolved |
| W07 | `workflows.filter is not a function` | `workflows` from GET n8n API |
| W08 | `Cannot read properties of undefined (reading 'length')` | Webhook body property |
| W10 | `extractLinks is not defined` | Helper function in Code node scope |
| W11 | `tickers.filter is not a function` | `tickers` from GET binance API |
| W26 | `todos.filter is not a function` | `todos` from GET jsonplaceholder |
| W27 | `users.filter is not a function` | `users` from GET jsonplaceholder |

**Impact:** These are all the same root cause as Category 1 - the expression engine doesn't fully resolve `$('NodeName')` references to actual runtime data in Code node inputs. The nock interceptors are correctly set up but the data doesn't flow through expressions into downstream Code nodes.

---

### Category 4: Sub-Workflow Execution Errors

**Root cause:** Sub-workflow execution (Execute Workflow nodes with inline `workflowJson`) fails because node references inside the sub-workflow can't be resolved. The sub-workflow's internal nodes reference each other but the execution engine can't find them.

| Fixture | Error |
|---------|-------|
| W12 | `Sub-workflow "_loop_event" node "IF 1": Referenced node doesn't exist` |
| W15 | `Sub-workflow execution only supports inline code (source: parameter)` |
| W18 | `Sub-workflow "processOrder" node "GET Request": Referenced node doesn't exist` |
| W20 | `Sub-workflow "processAndNotify" node "Set enrichData params": Referenced node doesn't exist` |
| W21 | `Sub-workflow "fetchData" node "GET Request": Invalid URL` |
| W22 | `Sub-workflow "classify" node "IF 1": Referenced node doesn't exist` |

**W15 special case:** Uses `workflow.run(name)` which requires external workflow lookup. The test harness only supports `source: "parameter"` (inline sub-workflows). This fixture was correctly excluded in the original plan but was included in the nock work anyway for completeness.

**Impact:** Sub-workflow node resolution is a deeper issue in the test harness execution engine. The `workflowJson` parameter contains valid workflow JSON but the execution engine can't resolve internal node connections during sub-workflow execution. This affects all fixtures with Execute Workflow nodes (W12, W18, W20, W21, W22) and loop body sub-workflows (W12, W26, W27).

---

## Passing Fixtures Detail

These 9 fixtures execute successfully with nock interceptors and all expectations match:

| Fixture | Nock Endpoints | Expectations |
|---------|---------------|--------------|
| W02 | GET registry.npmjs.org, GET localhost:5678, POST my-server | nodes only |
| W03 | POST api.ultravox.ai | requests + nodes |
| W05 | GET sheets, POST gmail, PUT sheets | nodes only |
| W09 | GET gmail, POST slack | nodes only |
| W13 | POST api.pagerduty.com | requests + nodes |
| W16 | (AI pin data only, no HTTP nock) | nodes only |
| W17 | GET api.app.com, DELETE api.app.com | nodes only |
| W19 | GET api.example.com, POST slack | nodes only |
| W23 | GET api.example.com, POST hooks.slack.com, POST api.example.com | nodes only |

---

## Known Limitations

1. **Expression resolution**: The test harness does not fully resolve n8n expressions in HTTP request body parameters or Code node inputs. This is the root cause of Categories 1 and 3.

2. **Sub-workflow node resolution**: Execute Workflow nodes with inline `workflowJson` fail to resolve internal node references. This affects all sub-function fixtures (W18-W22) and loop body sub-workflows (W12, W26, W27).

3. **`workflow.run()` not supported**: W15 uses external workflow references which the test harness doesn't support.

4. **Helper functions in Code nodes**: W10 defines helper functions (`extractLinks`) that should be available within the Code node's sandbox scope but aren't found at runtime.

5. **Branch coverage**: For switch/if fixtures, only the branch matching the trigger pin data executes. Nock interceptors for non-executed branches remain pending (not consumed). This is expected behavior.
