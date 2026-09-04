---
title: Nodes loading and node types
audience: Backend engineers new to n8n
tier: 3
reading_time: 8 min
last_reviewed: 2026-09-02
owner: "@n8n-io/catalysts"
---

# Nodes loading and node types

Read this when you need to know how the backend finds node and credential classes, why a node type name has a package prefix, or how community packages join the registry.

## What it is

Node and credential types are TypeScript classes shipped in npm packages, `n8n-nodes-base`, `@n8n/n8n-nodes-langchain`, and community `n8n-nodes-*` packages, or dropped as compiled files into a custom folder. `LoadNodesAndCredentials` in `packages/cli` discovers every source, wraps each in a **loader**, and merges them into one namespace where a node type name is `<packageName>.<name>`. `NodeTypes` and `CredentialTypes` are the thin lookups the engine calls to resolve a name and a version to a class. The system separates what it **knows** exists on disk from what it has **loaded**, so a main can boot with hundreds of nodes while instantiating only what a workflow needs.

## How it works

`LoadNodesAndCredentials.init()` runs these steps:

1. Extend the module search path so that node packages and the task runner resolve dependencies.
2. Apply the exclude list.
3. Scan for the two built-in packages and run a lazy loader on each.
4. Run a custom directory loader on `~/.n8n/custom` and on every path in `N8N_CUSTOM_EXTENSIONS`.
5. Add the loaders that modules contribute through `ModuleInterface.nodeLoaders()`. The community packages module returns one loader per installed package. The MCP registry module returns a loader that synthesizes a node per registry server.
6. Run `postProcessLoaders()`.

A loader keeps four structures. `known` holds the class name and source path per type. `nodeTypes` and `credentialTypes` hold the instantiated classes. `types` holds every description for the editor. A **lazy loader** reads `dist/known/*.json` and `dist/types/*.json`, produced at package build time, and instantiates a class only when `getNode(name)` is first called. Outside tests, class instantiation runs inside a Node.js `vm` context that exposes only `require`.

`postProcessLoaders()` rebuilds the merged registries, prefixes node type names with the package name, injects a "Custom API Call" option into nodes whose credentials support it, and synthesizes **tool** variants of every node marked `usableAsTool` so that agents can use them. After startup, each process calls `releaseTypes()` to drop the description arrays from memory, and the main writes them to a static cache folder for the editor.

`NodeTypes.getByNameAndVersion(name, version)` resolves a tool suffix to its base node when no real node has that name, picks the version, and attaches an `execute` that runs `RoutingNode` for declarative nodes. `CredentialTypes` answers which nodes a credential supports and walks the `extends` chain.

Community packages are installed into `~/.n8n/nodes` with npm, recorded in the database, and loaded or unloaded at runtime. Other mains learn about an install through pubsub commands. A non-default registry requires the license flag `feat:communityNodes:customRegistry`. Unverified packages can be blocked by configuration, and v3 changes that default.

## Where to look

| Path | What |
|---|---|
| `packages/cli/src/load-nodes-and-credentials.ts` | Discovery, loaders, post-processing |
| `packages/cli/src/node-types.ts`, `credential-types.ts` | The lookups the engine calls |
| `packages/core/src/nodes-loader/` | `DirectoryLoader`, `PackageDirectoryLoader`, `LazyPackageDirectoryLoader`, `CustomDirectoryLoader` |
| `packages/core/bin/generate-metadata` | Writes the `dist/known` and `dist/types` files at build time |
| `packages/cli/src/tool-generation/` | Tool variants of nodes |
| `packages/cli/src/modules/community-packages/` | Install, uninstall, verified list |
| `packages/cli/src/node-catalog/` | Search and describe nodes for the AI tools |
| `packages/@n8n/constants/src/nodes.ts` | The built-in package names |

## What it owns

`installed_packages` and `installed_nodes`, module entities under `packages/cli/src/modules/community-packages/`. On disk: `~/.n8n/custom`, `~/.n8n/nodes/node_modules`, and the static cache of type descriptions. No Redis keys. Pubsub commands `community-package-install`, `-update`, and `-uninstall`.

## Flags

`NODES_INCLUDE` and `NODES_EXCLUDE`, the latter excluding the Execute Command and Local File Trigger nodes by default. `NODES_ERROR_TRIGGER_TYPE`. `N8N_CUSTOM_EXTENSIONS` for extra folders. `N8N_COMMUNITY_PACKAGES_ENABLED`, `N8N_COMMUNITY_PACKAGES_REGISTRY`, `N8N_UNVERIFIED_PACKAGES_ENABLED`, and `N8N_COMMUNITY_PACKAGES_PREVENT_LOADING` in the module's own config. `N8N_DEV_RELOAD` enables hot reload in development. License flags `feat:communityNodes:customRegistry` and `feat:nodeTypePolicies`.

## Per mode

Every command loads the registry, so workers and webhook processes hold the same nodes as mains. Only the main writes the type descriptions for the editor and serves icons. Package installation is a REST operation on a main. Other processes learn about it through pubsub. No single versus multi-main branch exists here.

## Was, is, goes

**Was.** Every node class loaded eagerly at boot. Lazy loading arrived in 2022 with the generated `dist/known` files. Community packages lived in `packages/cli/src/services` until July 2025 and became a module in August 2025. **Is.** `NodeLoader` is the abstraction, and modules can contribute loaders from any source, not only the filesystem. **Goes.** Open `TODO` markers question the custom directory loading strategy and the old `n8n-nodes-base.` prefix fallback. The node catalog and the node definitions folder serve a newer set of consumers: the workflow SDK, MCP builder tools, and agents.

## Terms

- **known**: a type exists and its file is here, without instantiation.
- **loaded**: the instantiated class objects.
- **types**: one description per node version, for the editor, released after boot.
- **lazy loading**: reading the generated JSON instead of requiring every class.
- **package prefix**: the full node type name, such as `n8n-nodes-base.set`. Custom folder nodes use `CUSTOM`.
- **versioned node**: one class per version behind a `getNodeType(version)` method, or one class with a version array.
- **synthetic tool**: a `...Tool` type with no class of its own, converted from the base node on demand.
- **declarative node**: no `execute` method, HTTP routing driven by the description.
- **codex**: the `.node.json` file next to a node with categories and documentation links.

## Read more

- `packages/nodes-base/AGENTS.md` for the node contract
- [The workflow model](workflow-model.md)
- docs.n8n.io: community nodes and creating nodes pages
