# AGENTS.md

Guidance for the skills module (`packages/cli/src/modules/skills`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

The module is part of a modular monolith: one process holds many modules, and each module hides its internals behind a small public API. Inside the module, the usual n8n layers apply: controller, service, repository.

## What the module owns

- The skill tables `skill`, `skill_version` and `skill_file`.
- The rules of skills: create, save, names, moves, permissions and the delete guard.
- The settings page API (`/skills`) and skills telemetry.

Agent refs and publish pins (`agent_skill_dependency` and `agent_version_skill_dependency`) belong to the agents module.

## Layout

```
skills/
  index.ts             public API: the only import path for other modules
  testing/             fixtures, the SkillUsage fake and its contract cases, for tests outside the module
  skills.module.ts     entrypoint: entities, controller import and the check task
  skill-sync.config.ts Skill Sync settings, such as the check interval
  controllers/         REST routes
  services/            services, gates, the SkillUsage contract and its proxy
  database/
    entities/          Skill, SkillVersion, SkillFile, SkillSourceConnection, SkillSourceLink
    repositories/      SkillRepository, SkillSourceRepository (sources and their links)
  errors/              SkillNameTakenError, SkillParseError, SkillSyncedError, SkillSource*Error
  utils/               shared types, content helpers, hashes, name rules
  sources/             (Skill Sync) source clients and their registry
  __tests__/           unit tests, integration/, test-utils/
```

Put a file in the folder of its role. Keep the n8n file infixes: `.service.ts`, `.controller.ts`, `.repository.ts`, `.entity.ts`, `.contracts.ts` and `.error.ts`.

| Layer                    | Can import                                                                     | Cannot import             |
| ------------------------ | ------------------------------------------------------------------------------ | ------------------------- |
| `controllers/`           | services, DTOs from `@n8n/api-types`                                           | repositories              |
| `services/`, `sources/`  | services, repositories, utils, errors                                          | controllers               |
| `database/repositories/` | entities, types from utils, `@n8n/db`, `@n8n/typeorm`                          | services                  |
| `database/entities/`     | `@n8n/db`, `@n8n/typeorm`, types from `@n8n/api-types`                         | other files of the module |
| `utils/`, `errors/`      | `@n8n/api-types`, shared packages, entity types with `import type`, each other | DI, I/O, repositories     |

The layer table is a convention for review. Lint does not enforce it.

## Public API and contracts

Other modules call the services that `index.ts` exports. A contract (an abstract class) exists only where the caller cannot import the other side. The side that cannot import owns the contract, and the other side implements it.

`index.ts` exports:

| Export                                                  | Role                                                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `SkillService`                                          | User actions for every caller: REST, MCP tools, n8n Assistant tools and the agent builder |
| `SkillAccessService`                                    | Permission checks                                                                         |
| `SkillRuntimeService`                                   | What agents and n8n Assistant read to run skills                                          |
| `SkillsGate`, `AssistantSkillsFlagGate`                 | Whether skills are on, and whether n8n Assistant skills are on                            |
| `SkillUsage`, `SkillUsageProxy`                         | The contract that the agents module implements                                            |
| `SkillSourceCredentials`, `SkillSourceCredentialsProxy` | The contract for the credentials of skill sources, which cli implements                   |
| `SkillNameTakenError` and helpers                       | Shared errors, name rules, hashes and types                                               |

It does not export the controller (an import registers its routes), the module class, the repository or the entities. `__tests__/index.test.ts` checks the export list. If another module needs a new symbol, export it. Do not export symbols that no other module uses.

The skills module also owns `SkillSourceCredentials`: which n8n credentials a skill source may use, decrypted, with a fresh token for a type that mints one, such as a GitHub App. It cannot import the credential services of cli, so cli implements it in `CliSkillSourceCredentials` (`src/credentials/skill-source-credentials.ts`), with the rules of the workflow credential select, and `registerSkillSourceCredentials` registers a factory on `SkillSourceCredentialsProxy` after the modules start, in the `start` command and in the integration test server. A project source accepts the credentials of its project and the global credentials. A Global source accepts a credential whose owner has the global `skill:create` scope. A route that takes a credential checks both the scope and that the user can use it. `resolve` runs the `checkCredential` of the client before it mints a token, so a credential for another host sends no request.

The skills module cannot import the agents module, because the agents module imports skills. So the skills module owns `SkillUsage`: which agents use a skill, the projects of those agents, and the side effects of a save on them. The agents module implements it in `AgentSkillUsage` and registers it on `SkillUsageProxy` on init.

## Import rules

Two checks enforce two rules. The code-health rule `skills-module-boundary` resolves each import to a file, so relative imports cannot bypass it. The ESLint and oxlint configs of cli match the import strings and show errors in the editor. If you change a rule, change it in the code-health rule and in both lint configs.

- Code outside the module imports only `@/modules/skills`. Tests outside the module can also import `@/modules/skills/testing`.
- Code in the module imports nothing from cli outside the module, except an allowlist. The allowlist only shrinks. The rule also stops imports of the agents, MCP and instance-ai modules.

| Allowed import                                    | Used in                                        | Needed before a move to a package                                      |
| ------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `userHasScopes` (`@/permissions.ee/check-access`) | `SkillAccessService`                           | The scope checks move to `@n8n/backend-services`, as its README plans. |
| `PostHogClient` (`@/posthog`)                     | `AssistantSkillsFlagGate`, `SkillSyncFlagGate` | A shared package, or a contract that cli implements                    |
| `Telemetry` (`@/telemetry`)                       | `SkillsTelemetry`                              | A shared package, or a contract that cli implements                    |

These rules keep the module ready to move to `packages/modules/skills/backend`, like `packages/modules/insights/backend`. The ownership transfer manifest (`src/services/ownership-transfer/ownership-transfer.manifest.json`) also holds the path of `skill.entity.ts`.

## Services

Split services by capability, never by caller.

- `SkillService`: list, get, create, update and delete. A user action takes the `User` and checks access through `SkillAccessService`. The writes `createTrusted`, `saveTrusted` and `moveTrusted` check no access. A caller that checked access itself uses them inside its own transaction. After a trusted write commits, the caller calls `trackCreated` or `trackUpdated`.
  A synced skill is a skill with a `skill_source_link` row. `skill.source` records how the skill was created and keeps `github` after Stop syncing, so it never decides whether a skill is synced. A synced skill is read-only, and it moves only with its source: `moveTrusted` refuses it with `SkillSyncedError` (`action: 'move'`). `saveTrusted` refuses a content change to it with `SkillSyncedError`, unless the caller passes `allowSynced`. Only Skill Sync passes it, with content that it fetched from the source. A field that a `SkillUpdate` leaves out keeps its stored value, so Skill Sync sends every field: `references: []` removes all files, and `frontmatter: null` removes the frontmatter. A frontmatter change needs `baseVersionId`, because `baseSkillHash` does not cover the frontmatter. The package import uses the same update with `checkedTarget`.
- `SkillAccessService`: the project of a skill, access to one skill or to a list, and the checks for edit, move and the create target. For skill sources: `canOnSource`, `canChangeSourceScope` and `visibleSourceProjects`. A source reuses the skill scopes of its scope, so Skill Sync has no scopes of its own. `services/skill-source.policy.ts` maps each source action to its scope. The policy checks only skill scopes. A route that takes a credential, such as connect or replace credential, must also check that the user can use that credential.
- `SkillSourceService`: Skill Sync connect and import. It parses a link with the client that reads it, applies the duplicate rules, and creates synced skills through `createTrusted` with a link row each, in one transaction. `SkillSecurityScanner` checks each skill at discover and again at connect, because the source can change in between. Connect leaves out a `blocked` skill (`blocked_by_check`), and a `needs_review` skill unless the request lists its key in `reviewedSkillKeys` (`review_required`). So connect does not import a skill that needs review only since discover because the user reviewed another skill. `SkillSyncedFromService` gives the "Synced from" data of a skill detail.
- `SkillSyncService`: what happens to synced skills after the import. Stop syncing deletes the link, so the skill becomes a normal skill and keeps its versions. The check for updates runs from `SkillSourceCheckTask` (every `N8N_SKILL_SYNC_CHECK_INTERVAL_SECONDS`, one hour by default, on one main) and from Check now, through one use case. For a client with `probe`, it probes the source first, so an unchanged source costs one request. A client without `probe` has every synced skill fetched on each check. For a changed source it fetches each synced skill at the new revision and compares its content hash: the content of the latest version moves the base and drops a pending update, and new content gets the security check against the latest version and waits on the link as `update_available` or `update_blocked`. A SKILL.md that n8n cannot parse is an `update_blocked` update with no content. A skill folder that is gone is skipped. A check never changes a skill or a version. A check of a source that already runs on this main is joined. Every write is conditional on what the check read: `storePending` and `moveBase` on the pending hash of the link, `recordCheck` on the check time and the cursor. A write that another check, also on another main, got to first is skipped, and the check clears the cursor, so the next check reads every skill again. Check now claims its minute with one conditional update (`claimCheckNow`). Accept must move `baseContentHash`, as the check compares with it. After a rate limit, the access (credential, or public per source type) waits as long as the source asked, in memory. A source skipped during the wait stores `rate_limited` and keeps its check time, so the task still checks it first. Check now checks a source at most once a minute. The review of updates belongs here too.
- `SkillRuntimeService`: what a draft runs, runtime names, the publish snapshot, the targets and versions that agents read, and the reads of n8n Assistant. Agent reads have no permission check. The agents module checked access at attach time. The n8n Assistant reads check the project scopes of the session and access to each skill.

## Gates

- `SkillsGate.isEnabled` reads one fact: the agents module registered its `SkillUsage`. Without the agents module, the delete and move guards cannot see the agents that use a skill. Every entry point (REST, MCP, n8n Assistant) checks this gate. Do not check `isActive('agents')` or the proxy in other code.
- `AssistantSkillsFlagGate.isEnabled()` needs two facts: `SkillsGate` is on, and the PostHog instance flag `ASSISTANT_SKILLS_FLAG` is on. It switches n8n Assistant skills separately from skills.
- `SkillSyncFlagGate.isEnabled(user)` needs two facts: `SkillsGate` is on, and the per-user PostHog flag `SKILL_SYNC_FLAG` is on for that user. The Skill Sync controller checks it in a middleware before the body is validated, and the service calls `assertEnabled`. Both answer 404. The check task has no user, so it reads the flag of the user who created the source, or of the instance owner when that user is gone. Force the flag on with `N8N_FEATURE_FLAG_OVERRIDES='{"136_skill_sync":true}'`. The frontend reads the same flag through `useSkillSyncFlag`.

## DI and start order

The module registry starts `mcp`, then `skills`, then `instance-ai`, then `knowledge`, then `agents`. This module cannot be disabled while the agents module is on: `ModuleRegistry.eligibleModules` keeps `skills` eligible and logs a warning.

Services that inject `SkillUsage` exist before the agents module starts. The container gives `undefined` with no error for an unbound abstract constructor parameter. So skills code injects the concrete `SkillUsageProxy`, and the agents module calls `register` in its own init. Until then, no agent uses a skill.

## Names

| Kind                    | Rule                                                                                                | Example                   |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------- |
| Service                 | `Skill<Capability>Service`                                                                          | `SkillRuntimeService`     |
| Contract                | An abstract class named for the need, in a `*.contracts.ts` file                                    | `SkillUsage`              |
| Contract implementation | The implementing module or technology, then the contract name                                       | `AgentSkillUsage`         |
| Late binding            | The contract name, then `Proxy`, in a `*-proxy.service.ts` file, with `register` and `isRegistered` | `SkillUsageProxy`         |
| Feature switch          | `*Gate` in a `*-gate.ts` file. A PostHog check is a `*FlagGate`.                                    | `SkillsGate`              |
| Strategy                | `<Type><Strategy>`, and its registry is `<Strategy>Registry`                                        | `GitHubSkillSourceClient` |

Say "skills" or "skills module". Do not say "skills hub". Do not use "provider" for skill sources.

## Add a skill source

Skill Sync adds sources such as GitHub and GitLab. It uses the Strategy pattern with a registry. The abstract class `SkillSourceClient` in `sources/` is the contract. A client parses a link, gives the identity of a source, lists its skills and fetches one skill. It knows nothing else. The locator and the skill refs are opaque JSON that only the client reads.

1. Add one client for each source type in `sources/`, such as `GitHubSkillSourceClient` in `sources/github/`. It reads public repositories with `ls-refs` over git smart HTTP and the tarball of the head commit, so it does not use the GitHub REST API.
2. Run `describeSkillSourceClientContract` from `__tests__/test-utils/` on it. `__tests__/in-memory-skill-source-client.test.ts` runs the same cases on `InMemorySkillSourceClient`, which reads an `InMemoryPagesStore`: a pages source with no files and no branches. The test sets up the store, and the client only reads it. If the fake cannot pass a new case, the case has a git-only assumption.
3. Register each client on `SkillSourceClientRegistry`, keyed by its type, in `SkillsModule.init()`.
4. Keep the shared logic in `SkillSyncService`: compare hashes, build the diff, find conflicts, and write through `createTrusted` and `saveTrusted`. A source never writes skills itself.

`handles(url)` says, with no request, whether a link is for the client. The service picks the client that handles the link, so that client's errors reach the user. `discover` can return the revision of the source, and the service passes it to each `fetchLatest`, so one import reads one state of the source. A client throws `SkillSourceUrlError` for a link that it cannot read, `SkillSourceNotFoundError` for a source or skill that is gone, and `SkillSourceReadError` with a reason code for a rate limit, a failure of the source, or content over a limit. `SkillSourceService` turns them into `SkillSourceRequestError`, which sends the reason code in `meta.reason`. `probe` is the optional change probe: one request that gives a cursor, such as the head commit, which the check compares with `skill_source.probeCursor`. Add the other optional parts of the contract (provenance, writer) with the ticket that needs them.

Add a contract only where the implementation varies or a caller cannot import the other side. One implementation stays a concrete class.

## Tests

Pick the test by what the behavior depends on:

| The behavior depends on                             | Test                                                           | Where                                                                          |
| --------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Only its inputs: a name, scope, move or delete rule | Decision table with `it.each`, no mocks                        | `services/skill.policy.ts`, `services/skill-source.policy.ts`, and their tests |
| Roles and scopes from the database                  | Integration table: each role against each action and scope     | `__tests__/integration/skill-source-access.integration.test.ts`                |
| The order of reads, locks and writes in a service   | Unit test over `createSkillServices`                           | `__tests__/skill.service*.test.ts`                                             |
| A query, a transaction or a lock                    | Integration test on `testDb`                                   | `__tests__/integration/*.integration.test.ts`                                  |
| The agents module                                   | `FakeSkillUsage`, which passes the `SkillUsage` contract cases | `testing/`                                                                     |
| An entry point (REST, MCP, n8n Assistant)           | Success, refused, and skills off                               | the entry point's own tests                                                    |

If a decision sits between repository reads, move it into a pure function first and test that function with a table.

- `__tests__/test-utils/skill-services.ts` builds the three services over a mocked repository and transactions. The agents side is `FakeSkillUsage` behind a real `SkillUsageProxy`: seed agents, drafts and publishes with `usage.seed`, and do not mock its answers.
- `describeSkillUsageContract` in `testing/` holds the cases that every `SkillUsage` passes. `__tests__/skill-usage.fake.test.ts` runs them on the fake, and `../agents/__tests__/agent-skill-usage.integration.test.ts` runs them on the database. When the contract changes, change the cases first.
- `__tests__/integration/skills-off.integration.test.ts` loads the skills module without the agents module, so the gates are off with nothing stubbed.
- Tests outside the module use the fixtures in `testing/` to create skills and versions, read them back, and clear the tables. They never import the repository or the entities.
- `testing/` holds only what tests outside the module import. It is the one test path that the boundary rules allow, as `index.ts` is for code. Before you add a file to `testing/`, find the test outside the module that imports it. If no such test exists, put the file in `__tests__/test-utils/`. Move it to `testing/` with the first outside test that needs it. A fake or a contract suite for a strategy of this module, such as `InMemorySkillSourceClient`, stays in `__tests__/test-utils/`.
- AI tools report a refused write through `toSkillToolRefusal`, so MCP and n8n Assistant tell the model the same thing.
