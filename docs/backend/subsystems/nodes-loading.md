---
title: Nodes loading and node types
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Nodes loading and node types

Read this when you need to know how the backend finds node and credential classes, or why a node type name has a package prefix. It also covers community packages.

## What it is

Node and credential types are TypeScript classes in npm packages: `n8n-nodes-base`, `@n8n/n8n-nodes-langchain`, and community `n8n-nodes-*` packages. They can also be compiled files in a custom folder. `LoadNodesAndCredentials` in `packages/cli` finds every source and wraps each in a **loader**. It merges them into one namespace, where a node type name is `<packageName>.<name>`, such as `n8n-nodes-base.set`.

`NodeTypes` and `CredentialTypes` are the lookups that the engine calls. They resolve a name and a version to a class.

## Why it has this shape

**Known is not loaded.** A loader keeps what it **knows**, the class name and source path of each type, apart from what it has **loaded**. A main can boot with hundreds of nodes and create only the classes that a workflow needs. A **lazy loader** reads `dist/known/*.json` and `dist/types/*.json`, which the package build writes. It creates a class only on the first `getNode(name)` call.

**Classes load in a `vm` context.** `loadClassInIsolation` runs each node file in a context that exposes only `require`.

**Descriptions use a lot of memory.** The editor needs one description for each node version. After startup, each process calls `releaseTypes()` to drop them, and code that needs them later calls `collectTypes()` to rebuild them. A comment there warns that holding types in memory is costly.

**The package prefix avoids name clashes.** Two packages can both ship a node called `set`. `postProcessLoaders()` prefixes each name with its package name. Custom folder nodes use the `CUSTOM` prefix.

**Tool variants are synthetic.** Agents need tool versions of ordinary nodes. `postProcessLoaders()` creates a `...Tool` variant of each node marked `usableAsTool`. It has no class of its own. `NodeTypes` resolves the tool name back to the base node and converts it on demand.

**Declarative nodes get an `execute`.** A declarative node has no `execute` method. Its description drives HTTP requests. `NodeTypes` attaches an `execute` that runs `RoutingNode`.

**Modules can add loaders.** A module can return loaders from `nodeLoaders()`. The community packages module returns one loader for each installed package. The MCP registry module returns a loader that creates a node for each registry server. A loader does not have to read the filesystem.

**Every process loads the same nodes.** Workers and webhook processes hold the same registry as mains. Community packages are installed on a main through REST. Other processes learn about the change through pubsub commands.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Discovery and merge | `packages/cli/src/load-nodes-and-credentials.ts` | `LoadNodesAndCredentials.postProcessLoaders` |
| Node lookup | `packages/cli/src/node-types.ts` | `NodeTypes.getByNameAndVersion` |
| Credential lookup | `packages/cli/src/credential-types.ts` | `CredentialTypes` |
| Loader base | `packages/core/src/nodes-loader/directory-loader.ts` | `DirectoryLoader` |
| Lazy loader | `packages/core/src/nodes-loader/lazy-package-directory-loader.ts` | `LazyPackageDirectoryLoader` |
| Isolated class loading | `packages/core/src/nodes-loader/load-class-in-isolation.ts` | `loadClassInIsolation` |
| Tool variants | `packages/cli/src/tool-generation/ai-tools.ts` | `convertNodeToAiTool` |
| Module loaders | `packages/@n8n/backend-common/src/modules/module-registry.ts` | `ModuleRegistry.nodeLoaders` |
| Community packages | `packages/cli/src/modules/community-packages/community-packages.service.ts` | `CommunityPackagesService` |
| Node search for AI tools | `packages/cli/src/node-catalog/node-catalog.service.ts` | `NodeCatalogService` |

The build step that writes the `dist/known` and `dist/types` files is `packages/core/bin/generate-metadata`.

## What is moving

The node catalog serves newer consumers. Instance AI, the agents builder, and the MCP workflow-builder tools use it to search and describe nodes.

## Read more

- `packages/nodes-base/AGENTS.md` for the node contract
- [The workflow model](workflow-model.md) for the node type contract and `typeVersion`
- docs.n8n.io: community nodes and creating nodes pages
