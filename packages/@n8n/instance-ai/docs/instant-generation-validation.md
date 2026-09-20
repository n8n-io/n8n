# Instant generation with JEV

Live validation date: 2026-09-20. The tested model was `jev-1.13.0`, selected
through `jev-latest`. These results cover the supported compiler operations.
They do not establish a latency guarantee for all natural-language requests.

## API

The [TypeSafe API reference](https://docs.typesafe.ai/api) defines
`POST https://api.typesafe.ai/v1/systemone`. Authentication uses a Bearer token.
The body contains `model`, `state`, and a map of `questions`.
Each question has instructions and bounded criteria. Supported question types
are `choice`, `noul`, and `score`. Live requests verified all three types.

JEV selects among options. The compiler builds the workflow or agent config.
Independent route and operation questions share one request. Later compiler
reads reuse the matching answer within that turn. Low confidence still causes
a fallback. No confidence threshold was reduced for these measurements.

## End-to-end measurements

The measurement starts before the chat POST. It stops at the matching
`run-finish` SSE event. It includes routing, compilation, validation, database
writes, tool events, the final reply, and run completion. It excludes thread
creation and later execution of the generated artifact.

The probe used the built n8n backend, a separate SQLite database, and live JEV.
The backend had no usable generative model endpoint. An unexpected LLM fallback
therefore failed the probe. The test account allowed workflow writes in advance.
Human approval time was not part of the measurement.

Playwright ran three sequential rounds against an active connection pool.
All 15 turns finished within 1000 ms.

| Operation | Round 1 | Round 2 | Round 3 |
|---|---:|---:|---:|
| Create workflow | 407 ms | 372 ms | 442 ms |
| Edit workflow | 397 ms | 406 ms | 426 ms |
| Repair workflow | 473 ms | 507 ms | 465 ms |
| Create agent | 459 ms | 365 ms | 498 ms |
| Edit agent | 353 ms | 348 ms | 374 ms |

A second run started after a backend restart. Startup connection warmup was
enabled. All 15 turns passed again. The first workflow turn took 681 ms.
The complete second run is below. Both runs together passed 30 of 30 turns.

| Operation | Round 1 | Round 2 | Round 3 |
|---|---:|---:|---:|
| Create workflow | 681 ms | 352 ms | 382 ms |
| Edit workflow | 446 ms | 459 ms | 367 ms |
| Repair workflow | 473 ms | 433 ms | 417 ms |
| Create agent | 496 ms | 380 ms | 395 ms |
| Edit agent | 415 ms | 465 ms | 404 ms |

A separate eight-node workflow build used HubSpot, Slack, and Postgres.
Its three saved turns took 882, 413, and 383 ms. The saved graph had eight
nodes and the requested `customers` webhook path. Its external integrations
were not executed because the test account had no integration credentials.

The probe performed these checks in each round:

1. Create a POST webhook with email and company validation, an HTTP call,
   and an ID response.
2. Read the saved graph. Publish it on the isolated test server. Call its real
   webhook. Confirm that the local HTTP service receives the request body and
   that the webhook returns its ID.
   In the second run, also confirm that invalid email returns 400 without an
   HTTP service call.
3. Change the HTTP Request URL through chat. Read and publish the saved change.
   Execute the workflow. Confirm that the service receives the new URL.
4. Make the local service return 503. Confirm that the workflow fails.
5. Ask the assistant to fix that failed execution. Confirm that the same saved
   workflow gains retry settings. Publish the repair. Return 503 once more.
   Confirm that the retry reaches the service and returns its ID successfully.
6. Create Sales Helper with HubSpot and Slack tools. Read its saved config.
   Confirm that there are two tools, that runtime inputs use `$fromAI`, and
   that the instruction to never promise discounts remains present.
7. Add a Postgres lookup tool through chat. Confirm that the agent ID stays
   the same, the two existing tools stay unchanged, and the new tool selects
   the requested `leads` table.

The agent tests verified saved draft configuration. They did not execute
HubSpot, Slack, Postgres, or a conversational model. Those agents still need
model and integration credentials before they can run.

## Latency limits

Before connection warmup, full cold turns took about 1.1 seconds. Direct cold
JEV reads took 787–916 ms. Startup now opens the connection with the model-list
endpoint. A transport probe reused one connection after 6 and 20 seconds of
idle time. Those reads took 263 and 420 ms.

The one-second result applies to these supported operations with a warm
connection and approved writes. It is not a service-level guarantee. Network
delays, cold connections after idle expiry, larger graphs, missing information,
human approval, agent Preview, and generative fallback can take longer.
The decision timeout remains 1500 ms. It was not reduced to hide slow reads.

## Regression checks

- 178 compiler, router, tool, and simulation tests passed.
- 222 configuration tests passed.
- 3 transport timeout tests passed.
- 13 CLI adapter and build-mode tests passed.
- A live cancellation check ended with `user_cancelled`, no compiler tool
  calls, and no saved workflow binding.
- The backend dependency build passed: 60 tasks.
- Type checks passed for Instance AI, config, backend-network, and CLI.
- Lint passed for the same four packages. CLI lint excluded the pre-existing
  generated `bin/.cache` tree, which the package command otherwise scans.

The live probe used a test-owned `N8N_USER_FOLDER`. It did not use the
developer's n8n database. Its HTTP service accepted only local test traffic.
No external integration messages or records were created.
