# Architecture of node contracts

Start here. This page tells how the parts fit together and links to the page that has the
details. It does not repeat the rules of those pages.

A **node contract** is one operation of a service, for example `notion.databasePage.getAll`. It
has a manifest (data: inputs, outputs, permissions) and, for most kinds, a bundle (code). n8n
reads the manifest before it loads code, keeps old versions next to new ones, and picks the
isolation of the code from who signed it. The legacy nodes of `n8n-nodes-base` keep running next
to the contract nodes.

The code calls these "node contracts". The product name is "next nodes"
(`N8N_NODES_NEXT_*`). `N8N_INSTANCE_AI_NODE_CONTRACTS_ENABLED` switches the contract nodes on.

## Where to read next

| Question | Page |
|---|---|
| How do I write a node? | [README](../README.md) |
| What is in a manifest, which interface does a bundle get, and when does a version change? | [node-contract.md](node-contract.md) |
| How do credentials, triggers and declarative bindings work? | [credentials-triggers.md](credentials-triggers.md) |
| How do providers (chat models, tools, memory) work? | [providers.md](providers.md) |
| Where does a bundle run, and how is it isolated? | [sandboxed-execution.md](sandboxed-execution.md) |
| What does the host and guest wire protocol look like? | [spec/json-rpc.md](../spec/json-rpc.md) |

## Packages

```mermaid
flowchart BT
  sdk["@n8n/node-sdk<br/>author API, spec, host runtime,<br/>store format, runtimes"]
  compat["@n8n/node-contract-compat<br/>legacy ↔ contract"]
  base["@n8n/nodes-integrations<br/>integration nodes, embedded store,<br/>instance registry logic"]
  core["@n8n/nodes-core<br/>core nodes, embedded store"]
  wsdk["@n8n/workflow-sdk/next<br/>typed workflow code"]
  ai["@n8n/instance-ai<br/>AI workflow builder"]
  cli["cli<br/>n8n wiring"]
  legacy["n8n-nodes-base<br/>legacy nodes"]
  base --> sdk
  base --> compat
  base --> core
  core --> sdk
  compat --> sdk
  ai --> base
  ai --> compat
  ai --> wsdk
  cli --> base
  cli --> legacy
```

| Package | Has | Read first |
|---|---|---|
| `@n8n/node-sdk` | `defineNode` and `t` for authors; the spec (`spec/`); the host side that makes n8n node types from frozen versions (`toVersionedNodeType`); freeze, publish and the store format; the guest runtimes and the sandbox | `src/runtime.ts`, `src/sandbox.ts`, `src/runtime-policy.ts` |
| `@n8n/nodes-integrations` | Integration nodes, one vendor each (`src/nodes/<service>/actions/*.ts`); the list of first-party packages (`FIRST_PARTY_PACKAGES`); the instance logic that has no n8n dependency: origin, admission, pins, version resolution, sync, import and export | `src/index.ts`, `src/registry.ts`, `src/contract-registry.ts`, `src/migrated.ts` |
| `@n8n/nodes-core` | Core nodes: flow control, item transforms, host features (wait, webhook, form, schedule, data tables, code), HTTP Request and the AI roots. The engine and the flow SDK may name them by type | `src/index.ts` |
| `@n8n/node-contract-compat` | Derives manifests and typed modules from legacy node descriptions; composes a legacy node version where contract actions run some operations | `src/derive/`, `src/migrate/` |
| `@n8n/workflow-sdk` (`/next`) | The typed workflow code that the AI builder writes. `@n8n/node-sdk/codegen` makes the module text of each node for it | `src/next/flow.ts` |
| `@n8n/instance-ai` | Offers the typed node modules to the agent and builds the workflow | `src/tools/next-modules.ts`, `src/tools/workflows/next-workflow-build.ts` |
| `cli` | Loads the node types, pins each contract node at save, keeps the store in the database, makes the runtimes, syncs from the registry, and has the `contracts:*` commands | `src/load-nodes-and-credentials.ts`, `src/node-contracts-*.ts`, `src/commands/contracts/` |
| `@n8n/config`, `@n8n/db` | The settings (`instance-ai.config.ts`, `nodes.config.ts`) and the tables `node_contract_version` and `node_contract_status` | — |

The node packages hold node code and plain catalog data only (`src/catalog.ts`). The host code is
generic and lives in `@n8n/node-sdk`: the store, the version loader and the catalog of the
embedded stores (`src/contract-registry.ts`, `src/catalog.ts`). `cli` gives it the database rows,
the keys, the runtimes and the logger in one `HostRuntime` (`hostRuntime`, `src/runtime.ts`). So
the same logic runs in tests and scripts without n8n.

## Contract nodes and legacy nodes

| | Legacy node | Contract node |
|---|---|---|
| Unit | One class with all resources and operations | One action per operation |
| Description | Written by hand in the class | Made from the contract (`nodeDescriptionOf`) |
| n8n type | `n8n-nodes-base.notion`, `typeVersion` set in the class | `<source package>.<nodeNameOf(id)>`, e.g. `@n8n/nodes-core.httpRequestGet`; `typeVersion` = action major |
| Old versions | Kept in the class code | Separate frozen versions in a store |
| Comes from | The release only | The release (HEAD), the registry, or an import |
| Permissions | None declared | Declared in the manifest, checked by the host |
| Runs | In the n8n process | In the runtime that its origin allows |

The engine sees both as `INodeType` in one registry (`LoadNodesAndCredentials`). Bridges:

- **Composed versions.** `MIGRATED_NODES` (`nodes-integrations/src/catalog.ts`) adds a new
  version of a legacy node, for example Notion v4. A contract action runs some operations, and
  the legacy version runs the rest (`migrateVersion` of compat). A user sees one Notion node.
- **Hidden single types.** The nodes panel hides the type of each single action
  (`composeContractNodes`). The AI builder and saved workflows still use them.
- **Credentials.** A contract credential type replaces the legacy type of the same name, for
  example `notionApi`. So legacy and contract nodes use one credential
  (`preferContractCredentials`).
- **Native contracts.** A legacy trigger or core node can have a manifest and no bundle. The
  legacy node runs it; the manifest gives the AI builder and the store its contract.
- **Derived modules.** For a legacy node without a contract, the AI builder derives a typed
  module from its description (`deriveModuleVersion` of compat).
- **Tools.** n8n generates the agent tool variant of each action, as it does for legacy nodes.

## Lifecycle

```mermaid
flowchart LR
  W["1 Write<br/>defineNode, n8n-node-next check"] --> F["2 Freeze<br/>pnpm freeze"]
  F --> E["embedded store<br/>dist/store (HEAD)"]
  F --> P["3 Publish<br/>pnpm publish:contracts"]
  P --> R["registry<br/>https:// or file://"]
  E --> L
  R -- "4 Install<br/>sync, fetch, import" --> S["instance store<br/>node_contract_version"]
  S --> L["5 Load<br/>node types"]
  L --> X["6 Run<br/>pin → version → runtime"]
```

### 1. Write

An author writes `defineNode` and one `node.action(...)` per operation, then runs
`n8n-node-next check` and `test`. See the [README](../README.md).

### 2. Freeze

`pnpm freeze` in each first-party package (part of `build`) calls `freezePackage`. It finds the
contracts in the exports of `src/nodes/<node>/actions/*.ts`, with no list. It bundles each action
and writes its manifest, bundle and fixtures into `dist/store`.
`pnpm publish:contracts` calls `publishPackage`. Freeze takes the version from the source and
sets the lowest Node Contract version that the bundle needs. The same source gives the same bytes. The release
ships this store, so its versions are first-party with no key check. Details:
[node-contract.md, Versions](node-contract.md#versions) and
[Store layout](node-contract.md#store-layout).

### 3. Publish

`pnpm publish:contracts` adds the HEAD of each action, trigger, credential and native contract
to a registry folder, and signs each manifest. The publish gate refuses a version bump that is
smaller than the contract change (`diffContracts`). A publisher never changes a published line.
It appends a yank, revoke or deprecate line. Details:
[Version of an action change](node-contract.md#version-of-an-action-change) and
[Status lines](node-contract.md#status-lines).

### 4. Install

An instance has two sources: the embedded store of its release, and its own store, the
`node_contract_version` table that all mains and workers read. Versions go into the table in
four ways:

| How | When | Code |
|---|---|---|
| Sync of pinned versions | At start and at leader takeover, on the leader main, in the background | `NodeContractsSync` |
| Fetch when needed | A run needs a pinned version or a newer patch that the table does not have | `contractStore` (`locked`, `newerPatches`) |
| `n8n contracts:sync` | On demand, from a registry or a folder | `commands/contracts/sync.ts` |
| `n8n contracts:import --input=<dir>` | A host without network, after `contracts:export` on another host | `commands/contracts/import.ts` |

- Only the leader main and the `contracts:*` commands fetch from `N8N_NODE_CONTRACTS_REGISTRY_URL`.
  Workers and follower mains only read the table, so they need no registry egress.
- Before the table takes a version, the store checks each blob digest, checks the manifest
  against the pin, and records the **origin** from the key that signed it:
  `first-party`, `community` (vetting key) or `private` (no trusted key). See
  [sandboxed-execution.md, n8n configuration](sandboxed-execution.md#n8n-configuration).
- A version that brings a new major logs the permissions that it adds and emits
  `node-contract-installed`.
- After an add, the main tells the other mains to reload their node types (pubsub).

### 5. Load

`ContractNodeLoader` (`cli/src/node-contracts-registry.ts`) makes one versioned node type for
each action id from manifests only. It lists the bundled HEAD of each major, and the stored
versions of the majors that the release does not have. It skips an id that `NODES_EXCLUDE` or
`NODES_INCLUDE` leaves out, a version that `N8N_NODE_PERMISSIONS_DENY` denies, and a stored
version whose Node Contract version this n8n does not run. No bundle loads yet. Then `composeContractNodes` adds
the composed legacy versions and the tool types.

Before `new Workflow`, `prepareNodeContractsRun` adds the stored majors that the workflow needs,
so a node of a major that arrived after start does not fail with `NodeVersionNotFoundError`.

### 6. Run

```mermaid
sequenceDiagram
  participant E as engine
  participant T as node type (node-sdk)
  participant V as version loader (nodes-integrations)
  participant P as executor loader (node-sdk)
  participant G as guest runtime
  E->>T: execute()
  T->>V: version for this node
  V->>V: pin on the node, update policy,<br/>yank, revoke, deny list
  V-->>T: frozen version + origin
  T->>P: executor of the version (cached by bundle hash)
  P->>P: origin → runtime list → first runtime that serves it
  P->>G: start the bundle
  T->>G: run the items
  G-->>T: host calls (http, binary, …), checked by the host
  G-->>T: output items
  T-->>E: outputs, and the version that ran in the run metadata
```

- **Which version.** Each saved contract node has a pin, `contract: { version, digest }` next to
  `typeVersion` (`INode.contract`). The digest is the `sha256:` of the manifest bytes. The host
  writes the pin at each save (editor, public API, `import:workflow`, source control pull, AI
  builder), in `pinNodeContracts` (`cli/src/node-contracts-run.ts`), before the policy check:
  - A node without a pin, or with a pin of another major, gets the newest bundled or stored
    version of its major that is not yanked or revoked (`ContractStore.pinOf`).
  - A pin of the same major stays when a bundled or stored version has its digest and version.
    A pin that no source has stays only when the save brings it (a create, an import, or a
    changed pin), so that `contracts:sync` can fetch it. A saved one is re-pinned, e.g. a pin of
    a bundled HEAD that a release replaced.
  - A node that the client sends without a pin keeps the pin of the stored node with its id.
  - A trigger has no pin: it runs the version that its node type projects.
  A node without a pin of its major runs the HEAD of its major. With
  `N8N_NODE_CONTRACTS_UPDATE_POLICY=tolerant` (default), a pinned node also takes a newer
  signed patch of the same origin and contract. With `strict`, it runs the pinned version. The
  pin travels with the node: a history version, a copy and an export keep their pins. When no
  source has the pinned version, a `tolerant` node runs a first-party HEAD of its major that is
  not older than the pin, and n8n logs a warning. Else the run fails and names the version.
  `meta.nodeContractsPolicy` of the saved workflow overrides the policy.
- **Where it runs.** The origin picks a runtime list (`N8N_NODES_NEXT_RUNTIMES_*`). The first
  runtime in the list that serves the version and is available runs it: `in-process`,
  `worker`, `wasm` or `container`. See
  [Runtimes and the runtime policy](sandboxed-execution.md#runtimes-and-the-runtime-policy).
- **What it may do.** Every runtime uses the same host checks: egress hosts, credential
  application, response size, binary data. The manifest is the source of the permissions on
  every path. See [node-contract.md, Rules](node-contract.md#rules).

The seams are two fields of the `HostRuntime` (`@n8n/node-sdk/src/runtime.ts`): `versionLoader` and
`executorLoader`. `nodeContractsRuntime` (`cli`) makes one runtime with the n8n settings at start,
and `contractNodeLoadersOf` gives it to the loader of each first-party package.

## Versions in one view

| Level | Example | Who sets it | What it decides |
|---|---|---|---|
| Node Contract | `2.9.0` | The spec. Freeze writes the lowest that a bundle needs | Whether this n8n can run the bundle |
| Action major | `notion.databasePage.getAll@1` | The author; a new permission forces a new major | The n8n `typeVersion`. A saved node keeps its major |
| Action minor and patch | `1.2.3` | The author, in the source | Which bundle a node runs inside its major |
| Pin | `INode.contract` (`{ version, digest }`) | The host, at each save | The exact version that a saved node runs |

A new permission always needs a new major, so an update never widens what a node may do. Full
rules: [node-contract.md, Versions](node-contract.md#versions).

## Settings that are not in another page

The runtime and key settings are in
[sandboxed-execution.md, n8n configuration](sandboxed-execution.md#n8n-configuration).

| Variable | Default | Meaning |
|---|---|---|
| `N8N_INSTANCE_AI_NODE_CONTRACTS_ENABLED` | `true` (spike) | Loads the contract nodes |
| `N8N_NODE_CONTRACTS_REGISTRY_URL` | — | The registry. Empty: only bundled and stored versions run |
| `N8N_NODE_CONTRACTS_UPDATE_POLICY` | `tolerant` | `tolerant` or `strict`, see Run. `meta.nodeContractsPolicy` of a workflow overrides it |
| `N8N_NODE_CONTRACTS_REVOKED_ALLOW` | — | `<id>@<version>` list of revoked versions that may still run |
| `N8N_NODE_CONTRACT_RANGE` | `>=2.0.0 <3.0.0` | The Node Contract versions that this n8n runs |
| `N8N_NODE_PERMISSIONS_DENY` | — | Permission classes that no node may have, for example `egress-input` or `code` |
