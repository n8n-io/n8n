---
name: n8n:public-api-live-testing
description: >-
  Runs an isolated local n8n instance and calls its Public API over real HTTP,
  and diffs a branch against master with a parity harness. Use when you must
  see an actual request and response, not an in-process test: to verify a
  migrated endpoint, to compare a branch against master, to check a generated
  OpenAPI spec, or to reproduce a customer report. Also use when the user says
  "run it locally", "curl the endpoint", "start a test instance", "check
  against master", or asks for a live API key.
---

# Test the Public API against a live instance

Unit and integration tests run the Public API in-process. Use this skill when
you need a real HTTP round trip: a real server, a real API key, a real
response body. For the code rules of the Public API, see
[public-api](../public-api/SKILL.md).

## Three traps. Read these first.

### 1. `N8N_USER_FOLDER` is not the data folder

n8n treats the value as a home directory and adds `.n8n` itself
(`packages/@n8n/config/src/utils/utils.ts`). The data goes to
`<N8N_USER_FOLDER>/.n8n`.

If the variable does not reach the `pnpm start` process, n8n uses `$HOME`. It
writes to the real `~/.n8n` of the developer and gives no warning.

- Set the variable on the same command line as `pnpm start`. Do not use a
  separate `export`.
- After the server starts, run `ls <folder>/.n8n` before you send a request.

### 2. Do not use port 5679 for `N8N_PORT`

The task runner broker starts in the same process and also uses 5679 by
default (`N8N_RUNNERS_BROKER_PORT`,
`packages/@n8n/config/src/configs/runners.config.ts`). The second bind fails
with `n8n Task Broker's port 5679 is already in use`. The message suggests a
second instance, but the cause is one instance that collides with itself.

Give each instance its own port pair. A normal `pnpm dev` holds 5678 and 5679.

| Instance | `N8N_PORT` | `N8N_RUNNERS_BROKER_PORT` |
|---|---|---|
| First (master) | 5681 | 5691 |
| Second (branch) | 5682 | 5692 |

### 3. An API key does not authenticate `/rest`

`/api/v1` accepts `X-N8N-API-KEY`. `/rest` accepts only the `n8n-auth`
session cookie from `/rest/owner/setup` or `/rest/login`. Some fixtures need
`/rest`: for example, no Public API endpoint runs a workflow, so an execution
fixture comes from `POST /rest/workflows/:workflowId/run`.

Two causes give the same `401 {"status":"error","message":"Unauthorized"}`:

| Cause | Check |
|---|---|
| No cookie sent | Send the cookie (`curl -b cookies.txt`) |
| The cookie is for a different instance | `/rest/login` must return 200 first. On the wrong instance the user does not exist, so login returns 401 and all later `/rest` calls fail |

When a `/rest` call returns 401, examine the login response first.

## Recipe: one instance

```bash
# 1. Build. Use build:unchecked if master has unrelated type errors.
cd packages/cli && pnpm build:unchecked

# 2. Start an isolated instance: own data folder, own ports, no telemetry.
N8N_USER_FOLDER=/tmp/n8n-test-instance N8N_PORT=5681 N8N_RUNNERS_BROKER_PORT=5691 \
  N8N_DIAGNOSTICS_ENABLED=false N8N_SECURE_COOKIE=false pnpm start

# 3. In a different terminal, before step 4: make sure the isolation works.
ls /tmp/n8n-test-instance/.n8n

# 4. Create the owner. This also logs you in and saves the cookie.
curl -c cookies.txt -X POST http://localhost:5681/rest/owner/setup \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User","password":"TestPassword123"}'

# 5. Create an API key. List each scope that the endpoint needs.
curl -b cookies.txt -X POST http://localhost:5681/rest/api-keys \
  -H 'Content-Type: application/json' \
  -d '{"label":"local-test","scopes":["workflow:read"],"expiresAt":null}'
# The key is in .data.rawApiKey.

# 6. Call the endpoint.
curl -i http://localhost:5681/api/v1/<endpoint> -H "X-N8N-API-KEY: <rawApiKey>"
```

- **`scopes` is required.** There is no "full access" default. See
  `packages/cli/src/controllers/api-keys.controller.ts`.
- **To log in again,** send `POST /rest/login` with
  `{"emailOrLdapLoginId": "...", "password": "..."}`.
- **To clean up,** stop the server and delete the `N8N_USER_FOLDER` folder.
- **To browse endpoints by hand,** open the Swagger UI at
  `http://localhost:5681/api/v1/docs`. It reads the generated OpenAPI spec.

## Recipe: compare a branch against master

Use this for every endpoint migration. Tests are written against the new code,
so they cannot show that the old behavior stays the same. A comparison of the
old YAML and the new Zod schema also misses differences. On `POST /workflows`,
the harness found 22 status-code differences and two `500` responses that code
review did not find.

```bash
# 1. Make a master worktree and build it.
git worktree add ../n8n-parity-master origin/master --detach
(cd ../n8n-parity-master && pnpm install --frozen-lockfile && pnpm build)

# 2. Start master and the branch, each with its own data folder and port pair.
(cd ../n8n-parity-master/packages/cli && N8N_USER_FOLDER=/tmp/parity/master \
  N8N_PORT=5681 N8N_RUNNERS_BROKER_PORT=5691 N8N_DIAGNOSTICS_ENABLED=false \
  N8N_SECURE_COOKIE=false pnpm start)
(cd packages/cli && N8N_USER_FOLDER=/tmp/parity/branch \
  N8N_PORT=5682 N8N_RUNNERS_BROKER_PORT=5692 N8N_DIAGNOSTICS_ENABLED=false \
  N8N_SECURE_COOKIE=false pnpm start)

# 3. Replay the same requests against both, then group the differences.
H=.agents/skills/public-api-live-testing/scripts/parity
node $H/run.mjs http://localhost:5681 /tmp/parity/master.json
node $H/run.mjs http://localhost:5682 /tmp/parity/branch.json
node $H/sortdiff.mjs /tmp/parity/master.json /tmp/parity/branch.json
```

`run.mjs` creates the owner and an API key on a new instance. For an instance
that already has an owner, such as a Nathan preview (see
[nathan](../nathan/SKILL.md)), set `PARITY_API_KEY` and `PARITY_PROJECT_ID`
(the ID of the personal project of the key owner). The script then skips
setup. If you do not set `PARITY_PROJECT_ID`, the `field-projectId` case
returns `404` and shows as a false difference.

### Read the output

`sortdiff.mjs` ignores key order, and replaces IDs, UUIDs and timestamps with
placeholders. Each other difference is a real difference. The script puts
differences with the same cause into one group. Work group by group: one root
cause usually explains 10 to 20 cases.

### Test a different endpoint

The cases in `scripts/parity/corpus.mjs` and the requests in `run.mjs` are for
`/workflows`. For a different endpoint:

1. Copy `corpus.mjs` and write cases for the request body of that endpoint:
   valid, missing fields, wrong types, unknown keys, read-only fields, and a
   body that is not an object.
2. In `run.mjs`, change the API key scopes and the requests in `main()`.
3. Also send a request to a route that the PR did not change. A change to a
   shared DTO can stop the spec bundle from compiling at startup. Then each
   legacy route returns `500`, and no test fails.

### Traps for the comparison

- **Rebuild `@n8n/api-types` after you change a DTO,** not only `cli`. If you
  do not, the server uses the old `dist` and the result is a false pass.
- **Merge master into the branch first,** so that the comparison shows only the
  changes of the PR.
