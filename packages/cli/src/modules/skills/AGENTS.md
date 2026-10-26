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
  testing/             fixtures, the SkillUsage fake and its contract cases, for tests
  skills.module.ts     entrypoint: entities and controller import
  controllers/         REST routes
  services/            services, gates, the SkillUsage contract and its proxy
  database/
    entities/          Skill, SkillVersion, SkillFile
    repositories/      SkillRepository
  errors/              SkillNameTakenError, SkillParseError, SkillSyncedError
  utils/               shared types, content helpers, hashes, name rules
  sources/             (Skill Sync) source clients and their registry
  __tests__/           unit tests, integration/, test-utils/
```

Put a file in the folder of its role. Keep the n8n file infixes: `.service.ts`, `.controller.ts`, `.repository.ts`, `.entity.ts`, `.contracts.ts` and `.error.ts`.

| Layer | Can import | Cannot import |
| -- | -- | -- |
| `controllers/` | services, DTOs from `@n8n/api-types` | repositories |
| `services/`, `sources/` | services, repositories, utils, errors | controllers |
| `database/repositories/` | entities, types from utils, `@n8n/db`, `@n8n/typeorm` | services |
| `database/entities/` | `@n8n/db`, `@n8n/typeorm`, types from `@n8n/api-types` | other files of the module |
| `utils/`, `errors/` | `@n8n/api-types`, shared packages, entity types with `import type`, each other | DI, I/O, repositories |

The layer table is a convention for review. Lint does not enforce it.

## Public API and contracts

Other modules call the services that `index.ts` exports. A contract (an abstract class) exists only where the caller cannot import the other side. The side that cannot import owns the contract, and the other side implements it.

`index.ts` exports:

| Export | Role |
| -- | -- |
| `SkillService` | User actions for every caller: REST, MCP tools, n8n Assistant tools and the agent builder |
| `SkillAccessService` | Permission checks |
| `SkillRuntimeService` | What agents and n8n Assistant read to run skills |
| `SkillsGate`, `AssistantSkillsFlagGate` | Whether skills are on, and whether n8n Assistant skills are on |
| `SkillUsage`, `SkillUsageProxy` | The contract that the agents module implements |
| `SkillNameTakenError` and helpers | Shared errors, name rules, hashes and types |

It does not export the controller (an import registers its routes), the module class, the repository or the entities. `__tests__/index.test.ts` checks the export list. If another module needs a new symbol, export it. Do not export symbols that no other module uses.

The skills module cannot import the agents module, because the agents module imports skills. So the skills module owns `SkillUsage`: which agents use a skill, the projects of those agents, and the side effects of a save on them. The agents module implements it in `AgentSkillUsage` and registers it on `SkillUsageProxy` on init.

## Import rules

Two checks enforce two rules. The code-health rule `skills-module-boundary` resolves each import to a file, so relative imports cannot bypass it. The ESLint and oxlint configs of cli match the import strings and show errors in the editor. If you change a rule, change it in the code-health rule and in both lint configs.

- Code outside the module imports only `@/modules/skills`. Tests outside the module can also import `@/modules/skills/testing`.
- Code in the module imports nothing from cli outside the module, except an allowlist. The allowlist only shrinks. The rule also stops imports of the agents, MCP and instance-ai modules.

| Allowed import | Used in | Needed before a move to a package |
| -- | -- | -- |
| `userHasScopes` (`@/permissions.ee/check-access`) | `SkillAccessService` | The scope checks move to `@n8n/backend-services`, as its README plans. |
| `PostHogClient` (`@/posthog`) | `AssistantSkillsFlagGate` | A shared package, or a contract that cli implements |
| `Telemetry` (`@/telemetry`) | `SkillsTelemetry` | A shared package, or a contract that cli implements |

These rules keep the module ready to move to `packages/modules/skills/backend`, like `packages/modules/insights/backend`. The ownership transfer manifest (`src/services/ownership-transfer/ownership-transfer.manifest.json`) also holds the path of `skill.entity.ts`.

## Services

Split services by capability, never by caller.

- `SkillService`: list, get, create, update and delete. A user action takes the `User` and checks access through `SkillAccessService`. The writes `createTrusted`, `saveTrusted` and `moveTrusted` check no access. A caller that checked access itself uses them inside its own transaction. After a trusted write commits, the caller calls `trackCreated` or `trackUpdated`.
  A synced skill (`skill.source` is a synced source, such as `github`) is read-only. `saveTrusted` refuses a content change to it with `SkillSyncedError`, unless the caller passes `allowSynced`. Only Skill Sync passes it, with content that it fetched from the source. A `SkillUpdate` holds partial `SkillContent`, so Skill Sync can also replace the frontmatter. It sends `baseContentHash`. An editor sends `baseSkillHash`.
- `SkillAccessService`: the project of a skill, access to one skill or to a list, and the checks for edit, move and the create target.
- `SkillRuntimeService`: what a draft runs, runtime names, the publish snapshot, the targets and versions that agents read, and the reads of n8n Assistant. Agent reads have no permission check. The agents module checked access at attach time. The n8n Assistant reads check the project scopes of the session and access to each skill.

## Gates

- `SkillsGate.isEnabled` reads one fact: the agents module registered its `SkillUsage`. Without the agents module, the delete and move guards cannot see the agents that use a skill. Every entry point (REST, MCP, n8n Assistant) checks this gate. Do not check `isActive('agents')` or the proxy in other code.
- `AssistantSkillsFlagGate.isEnabled()` needs two facts: `SkillsGate` is on, and the PostHog instance flag `ASSISTANT_SKILLS_FLAG` is on. It switches n8n Assistant skills separately from skills.

## DI and start order

The module registry starts `mcp`, then `skills`, then `instance-ai`, then `knowledge`, then `agents`. This module cannot be disabled while the agents module is on: `ModuleRegistry.eligibleModules` keeps `skills` eligible and logs a warning.

Services that inject `SkillUsage` exist before the agents module starts. The container gives `undefined` with no error for an unbound abstract constructor parameter. So skills code injects the concrete `SkillUsageProxy`, and the agents module calls `register` in its own init. Until then, no agent uses a skill.

## Names

| Kind | Rule | Example |
| -- | -- | -- |
| Service | `Skill<Capability>Service` | `SkillRuntimeService` |
| Contract | An abstract class named for the need, in a `*.contracts.ts` file | `SkillUsage` |
| Contract implementation | The implementing module or technology, then the contract name | `AgentSkillUsage` |
| Late binding | The contract name, then `Proxy`, in a `*-proxy.service.ts` file, with `register` and `isRegistered` | `SkillUsageProxy` |
| Feature switch | `*Gate` in a `*-gate.ts` file. A PostHog check is a `*FlagGate`. | `SkillsGate` |
| Strategy | `<Type><Strategy>`, and its registry is `<Strategy>Registry` | `GitHubSkillSourceClient` |

Say "skills" or "skills module". Do not say "skills hub". Do not use "provider" for skill sources.

## Add a skill source

Skill Sync adds sources such as GitHub and GitLab. Use the Strategy pattern with a registry, as `external-secrets.ee/provider-registry.service.ts` does.

1. Add the abstract class `SkillSourceClient` in `sources/`. A client knows how to list the skills of a location and fetch one skill. It knows nothing else.
2. Add one client for each source type, such as `GitHubSkillSourceClient`.
3. Register each client on `SkillSourceClientRegistry`, keyed by its type, in `SkillsModule.init()`.
4. Keep the shared logic in `SkillSyncService`: compare hashes, build the diff, find conflicts, and write through `createTrusted` and `saveTrusted`. A source never writes skills itself.

Add a contract only where the implementation varies or a caller cannot import the other side. One implementation stays a concrete class.

## Tests

Pick the test by what the behavior depends on:

| The behavior depends on | Test | Where |
| -- | -- | -- |
| Only its inputs: a name, scope, move or delete rule | Decision table with `it.each`, no mocks | `services/skill.policy.ts`, `__tests__/skill.policy.test.ts` |
| The order of reads, locks and writes in a service | Unit test over `createSkillServices` | `__tests__/skill.service*.test.ts` |
| A query, a transaction or a lock | Integration test on `testDb` | `__tests__/integration/*.integration.test.ts` |
| The agents module | `FakeSkillUsage`, which passes the `SkillUsage` contract cases | `testing/` |
| An entry point (REST, MCP, n8n Assistant) | Success, refused, and skills off | the entry point's own tests |

If a decision sits between repository reads, move it into a pure function first and test that function with a table.

- `__tests__/test-utils/skill-services.ts` builds the three services over a mocked repository and transactions. The agents side is `FakeSkillUsage` behind a real `SkillUsageProxy`: seed agents, drafts and publishes with `usage.seed`, and do not mock its answers.
- `describeSkillUsageContract` in `testing/` holds the cases that every `SkillUsage` passes. `__tests__/skill-usage.fake.test.ts` runs them on the fake, and `../agents/__tests__/agent-skill-usage.integration.test.ts` runs them on the database. When the contract changes, change the cases first.
- `__tests__/integration/skills-off.integration.test.ts` loads the skills module without the agents module, so the gates are off with nothing stubbed.
- Tests outside the module use the fixtures in `testing/` to create skills and versions, read them back, and clear the tables. They never import the repository or the entities.
- AI tools report a refused write through `toSkillToolRefusal`, so MCP and n8n Assistant tell the model the same thing.
