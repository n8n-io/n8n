---
title: Test a backend change
last_reviewed: 2026-11-06
contact: ivov
---

# Test a backend change

n8n backend tests use [Vitest](https://vitest.dev). This page shows where each kind of test lives, which helpers it uses, and how to run it on SQLite and PostgreSQL.

## Choose a kind of test

| Test | Location | Runs against |
|---|---|---|
| Unit test | `__tests__/` next to the code | Mocks, no database |
| Integration test | `packages/cli/test/integration/`, or `*.integration.test.ts` next to the code | A database and an n8n test server |
| Migration test | `packages/cli/test/migration/` | A database at the schema of the migration |
| End-to-end test | `packages/quality/testing/playwright/` | A browser and a running n8n |

Write a unit test for logic inside one service. Write an integration test when your change goes through a route, the database, or several services. [Write a database migration](write-a-database-migration.md#test-the-migration) covers migration tests, and `packages/quality/testing/playwright/AGENTS.md` covers end-to-end tests.

## Write a unit test

A unit test gets the class under test from the container, and replaces its dependencies with mocks. `mockInstance()` from `@n8n/backend-test-utils` puts a mock of a class into the container and returns the mock. For an example, see `execution-metadata.service.test.ts` in `packages/cli/`.

Run the test from `packages/cli/`:

```bash
pnpm test src/services/__tests__/execution-metadata.service.test.ts \
  --maxWorkers=1
```

## Write an integration test

An integration test starts an n8n test server with only the controllers that it needs. Use these helpers:

- `setupTestServer({ endpointGroups: ['tags'] })` starts the server with the controllers of those groups.
- `testServer.authAgentFor(user)` gives an HTTP client that is signed in as that user.
- `testDb.truncate(['TagEntity'])` empties tables between tests.

For an example, see `tags.api.test.ts` in `packages/cli/test/integration/`. A module loads itself in a test with `testModules.loadModules`, as [Build a backend module](build-a-backend-module.md#module-testing) shows.

Run the test from `packages/cli/` on SQLite:

```bash
pnpm test:integration test/integration/tags.api.test.ts \
  --maxWorkers=1
```

Then run it on PostgreSQL. The command needs Docker. It starts PostgreSQL and Redis in containers, and stops them after the run.

```bash
pnpm test:postgres:tc test/integration/tags.api.test.ts \
  --maxWorkers=1
```

## Test code that runs on several processes

A test process has no other mains or workers. Pubsub commands, leader handover, and work that a worker does need queue mode. Try them by hand with [Run queue mode locally](run-queue-mode-locally.md).
